import supabase from './db-client.js';
import { cors, requireUser, loadProfile } from './_auth.js';
import { ticketToken } from './_qr.js';
import { friendlyError } from './friendly-error.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const user = await requireUser(req, res); if (!user) return;
    const profile = await loadProfile(user.id);
    if (!profile) return res.status(403).json({ error: 'Profile not initialized' });

    const { scope, event_id } = req.query;

    if (scope === 'mine') {
      const { data: tickets, error } = await supabase.from('tickets').select('*').eq('attendee_id', user.id).order('created_at', { ascending: false });
      if (error) throw error;
      const eventIds = [...new Set(tickets.map(t => t.event_id))];
      const invIds = tickets.map(t => t.invitation_id);
      const [{ data: events }, { data: invs }] = await Promise.all([
        eventIds.length ? supabase.from('events').select('*').in('id', eventIds) : Promise.resolve({ data: [] }),
        invIds.length ? supabase.from('invitations').select('*').in('id', invIds) : Promise.resolve({ data: [] }),
      ]);
      const evById = Object.fromEntries((events || []).map(e => [e.id, e]));
      const invById = Object.fromEntries((invs || []).map(i => [i.id, i]));
      return res.status(200).json(tickets.map(t => ({
        ...t,
        qr_token: ticketToken(t),
        event: evById[t.event_id] || null,
        invitation: invById[t.invitation_id] || null,
      })));
    }

    if (event_id) {
      if (profile.role !== 'host') return res.status(403).json({ error: 'Hosts only' });
      const { data: ev } = await supabase.from('events').select('id').eq('id', event_id).eq('host_id', user.id).maybeSingle();
      if (!ev) return res.status(404).json({ error: 'Event not found' });
      const { data: tickets, error } = await supabase.from('tickets').select('*').eq('event_id', event_id).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(tickets.map(t => ({ ...t, qr_token: ticketToken(t) })));
    }

    return res.status(400).json({ error: 'scope=mine or event_id required' });
  } catch (err) {
    console.error('tickets error', err);
    return res.status(500).json({ error: friendlyError(err) });
  }
}
