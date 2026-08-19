import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function summarizeInvites(invites) {
  const stats = {
    guest_count: 0,
    checked_in_count: 0,
    accepted_count: 0,
    declined_count: 0,
    pending_count: 0,
    sent_count: 0,
    plus_ones: 0,
  };
  for (const inv of invites || []) {
    stats.guest_count += 1;
    stats.plus_ones += Number(inv.plus_ones) || 0;
    if (inv.status === 'checked_in') stats.checked_in_count += 1;
    else if (inv.status === 'accepted') stats.accepted_count += 1;
    else if (inv.status === 'declined') stats.declined_count += 1;
    else if (inv.status === 'sent') stats.sent_count += 1;
    else stats.pending_count += 1;
  }
  return stats;
}

function decorateLogs(logs, events) {
  const titles = {};
  for (const e of events || []) titles[e.id] = e.title;
  return (logs || []).map((log) => ({
    ...log,
    event_title: titles[log.event_id] || '',
  }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (req.method === 'GET') {
      const eventId = req.query.event_id;

      const { data: events, error: evErr } = await supabase
        .from('events')
        .select('id, title, capacity, status, starts_at, venue')
        .eq('user_id', user.id);
      if (evErr) throw evErr;

      const owned = events || [];
      const ids = owned.map((e) => e.id);

      if (eventId) {
        const event = owned.find((e) => String(e.id) === String(eventId));
        if (!event) return res.status(404).json({ error: 'Event not found' });

        const [{ data: logs, error: logErr }, { data: invites, error: invErr }] = await Promise.all([
          supabase
            .from('attendance_logs')
            .select('*')
            .eq('event_id', eventId)
            .order('created_at', { ascending: false })
            .limit(250),
          supabase.from('invitations').select('*').eq('event_id', eventId),
        ]);
        if (logErr) throw logErr;
        if (invErr) throw invErr;

        return res.status(200).json({
          event,
          logs: decorateLogs(logs, owned),
          invitations: invites || [],
          stats: summarizeInvites(invites),
        });
      }

      let logs = [];
      let invites = [];
      if (ids.length) {
        const [{ data: logRows, error: logErr }, { data: invRows, error: invErr }] = await Promise.all([
          supabase
            .from('attendance_logs')
            .select('*')
            .in('event_id', ids)
            .order('created_at', { ascending: false })
            .limit(60),
          supabase.from('invitations').select('event_id, status, plus_ones').in('event_id', ids),
        ]);
        if (logErr) throw logErr;
        if (invErr) throw invErr;
        logs = logRows || [];
        invites = invRows || [];
      }

      const activeEvents = owned.filter((e) => e.status === 'published').length;
      const stats = {
        ...summarizeInvites(invites),
        event_count: owned.length,
        active_events: activeEvents,
      };

      return res.status(200).json({
        events: owned,
        logs: decorateLogs(logs, owned),
        stats,
      });
    }

    if (req.method === 'POST') {
      const { invitation_id, action } = req.body || {};
      if (!invitation_id || !['check_in', 'undo'].includes(action)) {
        return res.status(400).json({ error: 'invitation_id and action (check_in|undo) are required' });
      }

      const { data: invitation, error: findErr } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitation_id)
        .single();
      if (findErr || !invitation) return res.status(404).json({ error: 'Invitation not found' });

      const { data: event, error: evErr } = await supabase
        .from('events')
        .select('*')
        .eq('id', invitation.event_id)
        .eq('user_id', user.id)
        .single();
      if (evErr || !event) return res.status(404).json({ error: 'Event not found' });

      if (action === 'check_in') {
        if (invitation.status === 'checked_in') {
          return res.status(200).json({
            invitation,
            result: 'duplicate',
            message: `${invitation.guest_name} is already checked in.`,
          });
        }
        const now = new Date().toISOString();
        const { data: updated, error: updErr } = await supabase
          .from('invitations')
          .update({ status: 'checked_in', checked_in_at: now })
          .eq('id', invitation.id)
          .select()
          .single();
        if (updErr) throw updErr;

        await supabase.from('attendance_logs').insert({
          invitation_id: invitation.id,
          event_id: event.id,
          result: 'override',
          guest_name: invitation.guest_name,
          scanned_by: user.id,
        });

        return res.status(200).json({
          invitation: updated,
          result: 'override',
          message: `${invitation.guest_name} checked in by host.`,
        });
      }

      const fallback = invitation.status === 'checked_in' ? 'accepted' : invitation.status;
      const { data: updated, error: updErr } = await supabase
        .from('invitations')
        .update({ status: fallback === 'checked_in' ? 'accepted' : 'accepted', checked_in_at: null })
        .eq('id', invitation.id)
        .select()
        .single();
      if (updErr) throw updErr;

      await supabase.from('attendance_logs').insert({
        invitation_id: invitation.id,
        event_id: event.id,
        result: 'undo',
        guest_name: invitation.guest_name,
        scanned_by: user.id,
      });

      return res.status(200).json({
        invitation: updated,
        result: 'undo',
        message: `${invitation.guest_name} check-in was reversed.`,
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
