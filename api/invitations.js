import crypto from 'crypto';
import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function assertOwnsEvent(userId, eventId) {
  const { data, error } = await supabase
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('user_id', userId)
    .single();
  if (error || !data) return false;
  return true;
}

function normalizeGuest(g) {
  const name = String(g.guest_name || g.name || '').trim();
  if (!name) return null;
  return {
    guest_name: name,
    guest_email: String(g.guest_email || g.email || '').trim().toLowerCase(),
    guest_phone: String(g.guest_phone || g.phone || '').trim(),
    plus_ones: Math.max(0, Number(g.plus_ones) || 0),
    note: String(g.note || '').trim(),
    status: g.status || 'pending',
    qr_token: crypto.randomUUID(),
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const eventId = req.query.event_id;
      if (!eventId) return res.status(400).json({ error: 'event_id is required' });
      const owns = await assertOwnsEvent(user.id, eventId);
      if (!owns) return res.status(404).json({ error: 'Event not found' });
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('event_id', eventId)
        .order('guest_name', { ascending: true });
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { event_id, guests } = req.body || {};
      if (!event_id) return res.status(400).json({ error: 'event_id is required' });
      const { data: event, error: evErr } = await supabase
        .from('events')
        .select('id, capacity, user_id')
        .eq('id', event_id)
        .eq('user_id', user.id)
        .single();
      if (evErr || !event) return res.status(404).json({ error: 'Event not found' });

      const raw = Array.isArray(guests) ? guests : [req.body];
      const rows = raw.map(normalizeGuest).filter(Boolean).map((g) => ({ ...g, event_id }));
      if (!rows.length) return res.status(400).json({ error: 'At least one guest name is required' });

      const { count } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event_id);
      if ((count || 0) + rows.length > (event.capacity || 0)) {
        return res.status(400).json({
          error: `Capacity is ${event.capacity}. ${Math.max(0, event.capacity - (count || 0))} seats remain.`,
        });
      }

      const { data, error } = await supabase.from('invitations').insert(rows).select();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, guest_name, guest_email, guest_phone, plus_ones, note, status } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Invitation id is required' });
      const { data: existing, error: findErr } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', id)
        .single();
      if (findErr || !existing) return res.status(404).json({ error: 'Invitation not found' });
      const owns = await assertOwnsEvent(user.id, existing.event_id);
      if (!owns) return res.status(404).json({ error: 'Invitation not found' });
      const patch = {};
      if (guest_name !== undefined) patch.guest_name = String(guest_name).trim();
      if (guest_email !== undefined) patch.guest_email = String(guest_email).trim().toLowerCase();
      if (guest_phone !== undefined) patch.guest_phone = String(guest_phone).trim();
      if (plus_ones !== undefined) patch.plus_ones = Math.max(0, Number(plus_ones) || 0);
      if (note !== undefined) patch.note = note;
      if (status !== undefined) {
        patch.status = status;
        if (status === 'checked_in' && !existing.checked_in_at) {
          patch.checked_in_at = new Date().toISOString();
        }
        if (status !== 'checked_in' && existing.status === 'checked_in') {
          patch.checked_in_at = null;
        }
      }
      const { data, error } = await supabase
        .from('invitations')
        .update(patch)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Invitation id is required' });
      const { data: existing, error: findErr } = await supabase
        .from('invitations')
        .select('id, event_id')
        .eq('id', id)
        .single();
      if (findErr || !existing) return res.status(404).json({ error: 'Invitation not found' });
      const owns = await assertOwnsEvent(user.id, existing.event_id);
      if (!owns) return res.status(404).json({ error: 'Invitation not found' });
      await supabase.from('attendance_logs').delete().eq('invitation_id', id);
      const { error } = await supabase.from('invitations').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
