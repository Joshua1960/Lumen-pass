import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const token = req.query.token;
      if (!token) return res.status(400).json({ error: 'token is required' });
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('qr_token', token)
        .single();
      if (error || !invitation) return res.status(404).json({ error: 'Invitation not found' });
      const { data: event, error: evErr } = await supabase
        .from('events')
        .select('id, title, description, venue, address, starts_at, ends_at, capacity, dress_code, cover_image, status')
        .eq('id', invitation.event_id)
        .single();
      if (evErr || !event) return res.status(404).json({ error: 'Event not found' });
      return res.status(200).json({ invitation, event });
    }

    if (req.method === 'PUT') {
      const { token, status } = req.body || {};
      if (!token) return res.status(400).json({ error: 'token is required' });
      if (!['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ error: 'status must be accepted or declined' });
      }
      const { data: invitation, error: findErr } = await supabase
        .from('invitations')
        .select('*')
        .eq('qr_token', token)
        .single();
      if (findErr || !invitation) return res.status(404).json({ error: 'Invitation not found' });
      if (invitation.status === 'checked_in') {
        return res.status(400).json({ error: 'Already checked in — RSVP cannot be changed' });
      }
      const { data: event } = await supabase
        .from('events')
        .select('id, title, description, venue, address, starts_at, ends_at, capacity, dress_code, cover_image, status')
        .eq('id', invitation.event_id)
        .single();
      if (event?.status === 'cancelled') {
        return res.status(400).json({ error: 'This event has been cancelled' });
      }
      const { data: updated, error } = await supabase
        .from('invitations')
        .update({ status })
        .eq('id', invitation.id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ invitation: updated, event });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
