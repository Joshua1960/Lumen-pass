import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function extractToken(raw) {
  if (!raw) return '';
  const text = String(raw).trim();
  try {
    const url = new URL(text);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('invite');
    if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    /* not a url */
  }
  const match = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : text;
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

    const eventId = Number(req.body?.event_id);
    const token = extractToken(req.body?.token);
    if (!eventId || !token) {
      return res.status(400).json({ error: 'event_id and token are required' });
    }

    const { data: event, error: evErr } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', user.id)
      .single();
    if (evErr || !event) return res.status(404).json({ error: 'Event not found' });

    const { count: checkedCount } = await supabase
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'checked_in');

    const logAndReturn = async (payload, invitationId = null, guestName = '') => {
      await supabase.from('attendance_logs').insert({
        invitation_id: invitationId,
        event_id: eventId,
        result: payload.result,
        guest_name: guestName || payload.guest_name || '',
        scanned_by: user.id,
      });
      return res.status(200).json({
        ...payload,
        event_title: event.title,
        checked_in_count: checkedCount || 0,
        capacity: event.capacity,
      });
    };

    if (event.status === 'cancelled') {
      return logAndReturn({
        result: 'cancelled',
        guest_name: '',
        plus_ones: 0,
        status: null,
        checked_in_at: null,
        message: 'This event has been cancelled.',
      });
    }

    const { data: invitation } = await supabase
      .from('invitations')
      .select('*')
      .eq('qr_token', token)
      .maybeSingle();

    if (!invitation || invitation.event_id !== eventId) {
      return logAndReturn({
        result: 'invalid',
        guest_name: '',
        plus_ones: 0,
        status: null,
        checked_in_at: null,
        message: 'This invitation is not valid for this event.',
      });
    }

    if (invitation.status === 'declined') {
      return logAndReturn({
        result: 'declined',
        guest_name: invitation.guest_name,
        plus_ones: invitation.plus_ones,
        status: invitation.status,
        checked_in_at: invitation.checked_in_at,
        message: `${invitation.guest_name} declined this invitation.`,
      }, invitation.id, invitation.guest_name);
    }

    if (invitation.status === 'checked_in') {
      return logAndReturn({
        result: 'duplicate',
        guest_name: invitation.guest_name,
        plus_ones: invitation.plus_ones,
        status: invitation.status,
        checked_in_at: invitation.checked_in_at,
        message: `${invitation.guest_name} already checked in.`,
      }, invitation.id, invitation.guest_name);
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
      event_id: eventId,
      result: 'success',
      guest_name: invitation.guest_name,
      scanned_by: user.id,
    });

    return res.status(200).json({
      result: 'success',
      guest_name: updated.guest_name,
      plus_ones: updated.plus_ones,
      status: updated.status,
      checked_in_at: updated.checked_in_at,
      message: `Welcome, ${updated.guest_name}.`,
      event_title: event.title,
      checked_in_count: (checkedCount || 0) + 1,
      capacity: event.capacity,
    });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
