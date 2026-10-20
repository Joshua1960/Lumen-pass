import supabase from './db-client.js';
import { cors, requireProfile } from './_auth.js';
import { friendlyError } from './friendly-error.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;
    const { event_id } = req.query;
    if (!event_id) return res.status(400).json({ error: 'event_id required' });
    const { data: ev } = await supabase.from('events').select('id').eq('id', event_id).eq('host_id', ctx.user.id).maybeSingle();
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    const [{ data: invs }, { data: tks }] = await Promise.all([
      supabase.from('invitations').select('*').eq('event_id', event_id).order('guest_name'),
      supabase.from('tickets').select('*').eq('event_id', event_id),
    ]);
    const tByInv = Object.fromEntries((tks || []).map(t => [t.invitation_id, t]));
    const rows = (invs || []).map(i => {
      const t = tByInv[i.id];
      return {
        invitation_id: i.id,
        guest_name: i.guest_name,
        guest_email: i.guest_email,
        plus_ones: i.plus_ones,
        status: i.status,
        ticket_id: t?.id || null,
        checked_in_at: t?.checked_in_at || null,
      };
    });
    return res.status(200).json(rows);
  } catch (err) {
    console.error('attendance error', err);
    return res.status(500).json({ error: friendlyError(err) });
  }
}
