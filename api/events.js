import supabase from './db-client.js';
import { cors, requireProfile } from './_auth.js';
import { friendlyError } from './friendly-error.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const auth = req.headers.authorization || '';
      const token = auth.replace('Bearer ', '').trim();
      // Public GET single event by id (used by attendees viewing tickets) is not allowed;
      // Host must be signed in.
      const ctx = await requireProfile(req, res, ['host']);
      if (!ctx) return;
      const { id } = req.query;
      if (id) {
        const { data: ev, error } = await supabase.from('events').select('*').eq('id', id).eq('host_id', ctx.user.id).maybeSingle();
        if (error) throw error;
        if (!ev) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json(ev);
      }
      const { data: events, error } = await supabase.from('events').select('*').eq('host_id', ctx.user.id).order('starts_at', { ascending: false });
      if (error) throw error;
      // Enrich with stats
      const ids = events.map(e => e.id);
      let invMap = {}, tMap = {}, ciMap = {};
      if (ids.length) {
        const [{ data: invs }, { data: tks }] = await Promise.all([
          supabase.from('invitations').select('event_id').in('event_id', ids),
          supabase.from('tickets').select('event_id, checked_in_at').in('event_id', ids),
        ]);
        for (const r of invs || []) invMap[r.event_id] = (invMap[r.event_id] || 0) + 1;
        for (const r of tks || []) {
          tMap[r.event_id] = (tMap[r.event_id] || 0) + 1;
          if (r.checked_in_at) ciMap[r.event_id] = (ciMap[r.event_id] || 0) + 1;
        }
      }
      const enriched = events.map(e => ({
        ...e,
        invitation_count: invMap[e.id] || 0,
        ticket_count: tMap[e.id] || 0,
        checked_in_count: ciMap[e.id] || 0,
      }));
      return res.status(200).json(enriched);
    }

    if (req.method === 'POST') {
      const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;
      const body = req.body || {};
      const row = {
        host_id: ctx.user.id,
        title: body.title,
        description: body.description || null,
        venue: body.venue,
        address: body.address || null,
        starts_at: body.starts_at,
        ends_at: body.ends_at || null,
        capacity: Number(body.capacity) || 50,
        dress_code: body.dress_code || null,
        cover_url: body.cover_url || null,
      };
      const { data, error } = await supabase.from('events').insert(row).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;
      const { id, ...rest } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      const patch = {};
      for (const k of ['title','description','venue','address','starts_at','ends_at','capacity','dress_code','cover_url']) {
        if (k in rest) patch[k] = rest[k];
      }
      const { data, error } = await supabase.from('events').update(patch).eq('id', id).eq('host_id', ctx.user.id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', id)
        .eq('host_id', ctx.user.id)
        .maybeSingle();
      if (eventError) throw eventError;
      if (!event) return res.status(404).json({ error: 'Event not found' });

      // Cascade delete tickets, invitations, scan_logs first
      const { error: logsError } = await supabase.from('scan_logs').delete().eq('event_id', id);
      if (logsError) throw logsError;
      const { error: ticketsError } = await supabase.from('tickets').delete().eq('event_id', id);
      if (ticketsError) throw ticketsError;
      const { error: invitationsError } = await supabase.from('invitations').delete().eq('event_id', id);
      if (invitationsError) throw invitationsError;
      const { error } = await supabase.from('events').delete().eq('id', id).eq('host_id', ctx.user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('events error', err);
    return res.status(500).json({ error: friendlyError(err) });
  }
}
