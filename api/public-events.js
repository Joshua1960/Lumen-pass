import supabase from './db-client.js';
import { cors } from './_auth.js';
import { friendlyError } from './friendly-error.js';

const publicFields = 'id, title, description, venue, address, starts_at, ends_at, capacity, dress_code, cover_url, is_public';

async function availableEvents(id) {
  const now = new Date().toISOString();
  let query = supabase
    .from('events')
    .select(publicFields)
    .eq('is_public', true)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order('starts_at', { ascending: true });
  if (id) query = query.eq('id', id);

  const { data: events, error } = await query;
  if (error) throw error;
  if (!events?.length) return [];

  const { data: invitations, error: invitationError } = await supabase
    .from('invitations')
    .select('event_id, plus_ones')
    .in('event_id', events.map((event) => event.id))
    .eq('status', 'accepted');
  if (invitationError) throw invitationError;

  const occupiedByEvent = new Map();
  for (const invitation of invitations || []) {
    const occupied = occupiedByEvent.get(invitation.event_id) || 0;
    occupiedByEvent.set(
      invitation.event_id,
      occupied + 1 + Math.max(0, Number(invitation.plus_ones) || 0),
    );
  }

  return events.map((event) => ({
    ...event,
    remaining_capacity:
      Number(event.capacity) - (occupiedByEvent.get(event.id) || 0),
  }));
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const events = await availableEvents(req.query.id);
    if (req.query.id && !events.length) {
      return res.status(404).json({ error: 'Event not found or no longer available.' });
    }
    return res.status(200).json(req.query.id ? events[0] : events);
  } catch (error) {
    console.error('public-events error', error);
    return res.status(500).json({ error: friendlyError(error) });
  }
}
