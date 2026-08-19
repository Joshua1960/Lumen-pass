import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function attachStats(events, invites) {
  const byEvent = {};
  for (const inv of invites || []) {
    if (!byEvent[inv.event_id]) {
      byEvent[inv.event_id] = { guest_count: 0, checked_in_count: 0, accepted_count: 0, declined_count: 0 };
    }
    const s = byEvent[inv.event_id];
    s.guest_count += 1;
    if (inv.status === 'checked_in') s.checked_in_count += 1;
    if (inv.status === 'accepted') s.accepted_count += 1;
    if (inv.status === 'declined') s.declined_count += 1;
  }
  return (events || []).map((e) => ({
    ...e,
    guest_count: byEvent[e.id]?.guest_count || 0,
    checked_in_count: byEvent[e.id]?.checked_in_count || 0,
    accepted_count: byEvent[e.id]?.accepted_count || 0,
    declined_count: byEvent[e.id]?.declined_count || 0,
  }));
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
      const id = req.query.id;
      let query = supabase.from('events').select('*').eq('user_id', user.id);
      if (id) query = query.eq('id', id);
      const { data: events, error } = await query.order('starts_at', { ascending: true });
      if (error) throw error;
      const ids = (events || []).map((e) => e.id);
      let invites = [];
      if (ids.length) {
        const { data, error: invErr } = await supabase
          .from('invitations')
          .select('event_id, status')
          .in('event_id', ids);
        if (invErr) throw invErr;
        invites = data || [];
      }
      const withStats = attachStats(events, invites);
      if (id) {
        if (!withStats.length) return res.status(404).json({ error: 'Event not found' });
        return res.status(200).json(withStats[0]);
      }
      return res.status(200).json(withStats);
    }

    if (req.method === 'POST') {
      const {
        title, description, venue, address, starts_at, ends_at,
        capacity, dress_code, cover_image, status,
      } = req.body || {};
      if (!title || !venue || !starts_at || !description) {
        return res.status(400).json({ error: 'Title, description, venue, and start time are required' });
      }
      if (Number(capacity) < 1) {
        return res.status(400).json({ error: 'Capacity must be at least 1' });
      }
      const { data, error } = await supabase
        .from('events')
        .insert({
          user_id: user.id,
          title: String(title).trim(),
          description: description || '',
          venue: String(venue).trim(),
          address: address || '',
          starts_at,
          ends_at: ends_at || starts_at,
          capacity: Number(capacity) || 100,
          dress_code: dress_code || '',
          cover_image: cover_image || '/covers/gala.jpg',
          status: status || 'published',
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json({
        ...data,
        guest_count: 0,
        checked_in_count: 0,
        accepted_count: 0,
        declined_count: 0,
      });
    }

    if (req.method === 'PUT') {
      const {
        id, title, description, venue, address, starts_at, ends_at,
        capacity, dress_code, cover_image, status,
      } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Event id is required' });
      const patch = {};
      if (title !== undefined) patch.title = String(title).trim();
      if (description !== undefined) patch.description = description;
      if (venue !== undefined) patch.venue = String(venue).trim();
      if (address !== undefined) patch.address = address;
      if (starts_at !== undefined) patch.starts_at = starts_at;
      if (ends_at !== undefined) patch.ends_at = ends_at;
      if (capacity !== undefined) patch.capacity = Number(capacity);
      if (dress_code !== undefined) patch.dress_code = dress_code;
      if (cover_image !== undefined) patch.cover_image = cover_image;
      if (status !== undefined) patch.status = status;
      const { data, error } = await supabase
        .from('events')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Event not found' });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Event id is required' });
      const { data: existing, error: findErr } = await supabase
        .from('events')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();
      if (findErr || !existing) return res.status(404).json({ error: 'Event not found' });
      await supabase.from('attendance_logs').delete().eq('event_id', id);
      await supabase.from('invitations').delete().eq('event_id', id);
      const { error } = await supabase.from('events').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
