import supabase from './db-client.js';
import { cors, randomToken } from './_auth.js';
import { ticketToken } from './_qr.js';
import { friendlyError } from './friendly-error.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'POST') {
      const { event_id, guest_name, guest_email, website } = req.body || {};
      if (website) return res.status(400).json({ error: 'Invalid request.' });
      if (
        typeof event_id !== 'string' ||
        typeof guest_name !== 'string' ||
        typeof guest_email !== 'string'
      ) {
        return res.status(400).json({ error: 'Event, name and email are required.' });
      }

      const name = guest_name.trim();
      const email = guest_email.trim().toLowerCase();
      if (!name || name.length > 120) {
        return res.status(400).json({ error: 'Name must be between 1 and 120 characters.' });
      }
      if (email.length > 320 || !emailPattern.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
      }

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, starts_at, capacity, is_public')
        .eq('id', event_id)
        .gte('starts_at', new Date().toISOString())
        .maybeSingle();
      if (eventError) throw eventError;
      if (!event) return res.status(404).json({ error: 'Event not found or no longer available.' });
      if (!event.is_public) {
        return res.status(404).json({ error: 'This event is not accepting public requests.' });
      }

      const { data: accepted, error: capacityError } = await supabase
        .from('invitations')
        .select('plus_ones')
        .eq('event_id', event_id)
        .eq('status', 'accepted');
      if (capacityError) throw capacityError;
      const occupied = (accepted || []).reduce(
        (total, invitation) => total + 1 + Math.max(0, Number(invitation.plus_ones) || 0),
        0,
      );
      if (occupied >= Number(event.capacity)) {
        return res.status(409).json({ error: 'This event has reached capacity.' });
      }

      const { data: existing, error: duplicateError } = await supabase
        .from('invitations')
        .select('id')
        .eq('event_id', event_id)
        .eq('guest_email', email)
        .eq('status', 'requested')
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (existing) {
        return res.status(409).json({ error: 'A request for this email is already awaiting review.' });
      }

      const { data: invitation, error } = await supabase
        .from('invitations')
        .insert({
          event_id,
          token: randomToken(48),
          guest_name: name,
          guest_email: email,
          plus_ones: 0,
          status: 'requested',
        })
        .select('token, status')
        .single();
      if (error?.code === '23505') {
        return res.status(409).json({ error: 'A request for this email is already awaiting review.' });
      }
      if (error) throw error;

      return res.status(201).json({
        claim_token: invitation.token,
        status: invitation.status,
      });
    }

    if (req.method === 'GET') {
      const { token } = req.query;
      if (typeof token !== 'string' || token.length !== 48) {
        return res.status(400).json({ error: 'A valid pass link is required.' });
      }

      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('id, event_id, guest_name, status')
        .eq('token', token)
        .maybeSingle();
      if (error) throw error;
      if (!invitation) return res.status(404).json({ error: 'Request not found.' });

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id, title, description, venue, address, starts_at, ends_at, dress_code')
        .eq('id', invitation.event_id)
        .single();
      if (eventError) throw eventError;

      let ticket = null;
      if (invitation.status === 'accepted') {
        const { data, error: ticketError } = await supabase
          .from('tickets')
          .select('id, event_id, qr_secret, checked_in_at')
          .eq('invitation_id', invitation.id)
          .maybeSingle();
        if (ticketError) throw ticketError;
        if (!data) {
          return res.status(409).json({ error: 'Your pass is still being prepared. Please try again shortly.' });
        }
        ticket = { ...data, qr_token: ticketToken(data) };
      }

      return res.status(200).json({
        invitation: { guest_name: invitation.guest_name, status: invitation.status },
        event,
        ticket,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('public-interest error', error);
    return res.status(500).json({ error: friendlyError(error) });
  }
}
