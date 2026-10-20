import supabase from './db-client.js';
import { cors, requireProfile } from './_auth.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;
    const hostId = ctx.user.id;

    const [{ data: events }, { data: invs }, { data: tks }] = await Promise.all([
      supabase.from('events').select('*').eq('host_id', hostId).order('starts_at', { ascending: false }),
      supabase.from('invitations').select('event_id, id, guest_name, guest_email, status, plus_ones, created_at').in('event_id',
        (await supabase.from('events').select('id').eq('host_id', hostId)).data?.map(e => e.id) || []
      ),
      supabase.from('tickets').select('id, event_id, invitation_id, attendee_id, checked_in_at, created_at').in('event_id',
        (await supabase.from('events').select('id').eq('host_id', hostId)).data?.map(e => e.id) || []
      ),
    ]);

    const eventIds = (events || []).map(e => e.id);
    const { data: recentLogs } = eventIds.length
      ? await supabase.from('scan_logs').select('*').in('event_id', eventIds).order('created_at', { ascending: false }).limit(100)
      : { data: [] };

    // Aggregate stats
    const totalEvents = events?.length || 0;
    const totalInvitations = invs?.length || 0;
    const totalAccepted = invs?.filter(i => i.status === 'accepted').length || 0;
    const totalDeclined = invs?.filter(i => i.status === 'declined').length || 0;
    const totalTickets = tks?.length || 0;
    const totalArrived = tks?.filter(t => t.checked_in_at).length || 0;
    const totalScans = recentLogs?.length || 0;
    const validScans = recentLogs?.filter(l => l.result === 'valid').length || 0;
    const duplicateScans = recentLogs?.filter(l => l.result === 'duplicate').length || 0;
    const invalidScans = recentLogs?.filter(l => l.result === 'invalid').length || 0;

    // Per-event roll-up
    const eventStats = (events || []).map(e => {
      const eventInvs = (invs || []).filter(i => i.event_id === e.id);
      const eventTks = (tks || []).filter(t => t.event_id === e.id);
      return {
        id: e.id,
        title: e.title,
        venue: e.venue,
        starts_at: e.starts_at,
        capacity: e.capacity,
        invited: eventInvs.length,
        accepted: eventInvs.filter(i => i.status === 'accepted').length,
        declined: eventInvs.filter(i => i.status === 'declined').length,
        arrived: eventTks.filter(t => t.checked_in_at).length,
        tickets: eventTks.length,
      };
    });

    // Attach event title to logs
    const evById = Object.fromEntries((events || []).map(e => [e.id, e.title]));
    const logs = (recentLogs || []).map(l => ({ ...l, event_title: evById[l.event_id] || 'Event' }));

    return res.status(200).json({
      totals: {
        events: totalEvents,
        invitations: totalInvitations,
        accepted: totalAccepted,
        declined: totalDeclined,
        tickets: totalTickets,
        arrived: totalArrived,
        scans: totalScans,
        valid: validScans,
        duplicate: duplicateScans,
        invalid: invalidScans,
      },
      events: eventStats,
      recent_scans: logs,
    });
  } catch (err) {
    console.error('admin error', err);
    return res.status(500).json({ error: err.message });
  }
}
