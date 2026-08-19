import crypto from 'crypto';
import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function parseGuests(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((g) => ({
        guest_name: String(g.guest_name || g.name || '').trim(),
        guest_email: String(g.guest_email || g.email || '').trim().toLowerCase(),
        guest_phone: String(g.guest_phone || '').trim(),
        plus_ones: Math.max(0, Number(g.plus_ones) || 0),
        note: String(g.note || '').trim(),
        status: g.status || 'sent',
        qr_token: crypto.randomUUID(),
      }))
      .filter((g) => g.guest_name);
  }
  return [];
}

function parseBulkText(text) {
  return String(text || '')
    .split(/[\n;]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const angled = line.match(/^(.+?)<\s*([^>]+@[^>]+)\s*>$/);
      if (angled) {
        return { guest_name: angled[1].trim().replace(/,$/, ''), guest_email: angled[2].trim().toLowerCase() };
      }
      const parts = line.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2 && parts[1].includes('@')) {
        return { guest_name: parts[0], guest_email: parts[1].toLowerCase() };
      }
      if (line.includes('@') && !line.includes(' ')) {
        const local = line.split('@')[0].replace(/[._]/g, ' ');
        const name = local.replace(/\b\w/g, (c) => c.toUpperCase());
        return { guest_name: name || line, guest_email: line.toLowerCase() };
      }
      return { guest_name: line, guest_email: '' };
    });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { event_id, invitation_ids, guests, bulk_text, origin, mark_sent = true } = req.body || {};
    if (!event_id) return res.status(400).json({ error: 'event_id is required' });

    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .eq('user_id', user.id)
      .single();
    if (evErr || !event) return res.status(404).json({ error: 'Event not found' });

    const created = [];
    const toInsert = [
      ...parseGuests(guests),
      ...parseBulkText(bulk_text).map((g) => ({
        ...g,
        plus_ones: 0,
        note: g.note || 'Bulk dispatch',
        status: 'sent',
        qr_token: crypto.randomUUID(),
      })),
    ].map((g) => ({ ...g, event_id }));

    if (toInsert.length) {
      const { count } = await supabase
        .from('invitations')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event_id);
      if ((count || 0) + toInsert.length > (event.capacity || 0)) {
        return res.status(400).json({
          error: `Capacity is ${event.capacity}. ${Math.max(0, event.capacity - (count || 0))} seats remain.`,
        });
      }
      const { data, error } = await supabase.from('invitations').insert(toInsert).select();
      if (error) throw error;
      created.push(...(data || []));
    }

    let targets = [...created];
    if (Array.isArray(invitation_ids) && invitation_ids.length) {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('event_id', event_id)
        .in('id', invitation_ids);
      if (error) throw error;
      targets = [...targets, ...(data || [])];
    }

    if (!targets.length) {
      return res.status(400).json({ error: 'No invitations to dispatch' });
    }

    const unique = [];
    const seen = new Set();
    for (const row of targets) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      unique.push(row);
    }

    if (mark_sent) {
      const pendingIds = unique.filter((r) => r.status === 'pending').map((r) => r.id);
      if (pendingIds.length) {
        await supabase.from('invitations').update({ status: 'sent' }).in('id', pendingIds);
        unique.forEach((r) => {
          if (r.status === 'pending') r.status = 'sent';
        });
      }
    }

    const base = String(origin || '').replace(/\/$/, '') || '';
    const payload = unique.map((row) => ({
      ...row,
      magic_link: base ? `${base}/invite/${row.qr_token}` : `/invite/${row.qr_token}`,
    }));

    return res.status(200).json({
      event: { id: event.id, title: event.title },
      invitations: payload,
      created_count: created.length,
      dispatched: payload.length,
    });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
