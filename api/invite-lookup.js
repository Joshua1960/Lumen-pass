import supabase from './db-client.js';
import { cors, requireUser, loadProfile, randomToken } from './_auth.js';
import { ticketToken } from './_qr.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { token } = req.query;
      if (!token) return res.status(400).json({ error: 'token required' });
      const { data: inv, error } = await supabase.from('invitations').select('*').eq('token', token).maybeSingle();
      if (error) throw error;
      if (!inv) return res.status(404).json({ error: 'This invitation could not be found.' });
      const { data: ev } = await supabase.from('events').select('*').eq('id', inv.event_id).maybeSingle();
      return res.status(200).json({ invitation: inv, event: ev });
    }

    if (req.method === 'POST') {
      const user = await requireUser(req, res); if (!user) return;
      const profile = await loadProfile(user.id);
      if (!profile) return res.status(403).json({ error: 'Sign up as a guest to accept.' });
      if (profile.role !== 'attendee') return res.status(403).json({ error: 'Only guest accounts may accept invitations.' });

      const { token } = req.body || {};
      if (!token) return res.status(400).json({ error: 'token required' });
      const { data: inv, error: inviteError } = await supabase.from('invitations').select('*').eq('token', token).maybeSingle();
      if (inviteError) throw inviteError;
      if (!inv) return res.status(404).json({ error: 'Invitation not found' });

      const { data: acceptance, error: acceptError } = await supabase.rpc(
        'accept_invitation_with_capacity',
        { p_invitation_id: String(inv.id), p_user_id: user.id },
      );
      if (acceptError) throw acceptError;
      if (!acceptance?.accepted) {
        const status = acceptance?.reason === 'not_found' ? 404 : 409;
        const messages = {
          already_claimed: 'This invitation has already been claimed by another account.',
          not_accepting_responses: 'This invitation can no longer be accepted.',
          capacity_reached: 'This event has reached capacity.',
          capacity_not_configured: 'This event does not have a valid capacity configured.',
        };
        return res.status(status).json({
          error: messages[acceptance?.reason] || 'This invitation could not be accepted.',
        });
      }

      const { data: updated, error: updatedError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', inv.id)
        .single();
      if (updatedError) throw updatedError;

      const { data: existingTicket, error: existingError } = await supabase
        .from('tickets')
        .select('*')
        .eq('invitation_id', inv.id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingTicket) {
        if (existingTicket.attendee_id !== user.id) {
          return res.status(409).json({ error: 'This invitation is already linked to another attendee.' });
        }
        return res.status(200).json({ invitation: updated, ticket: { ...existingTicket, qr_token: ticketToken(existingTicket) } });
      }
      const secret = randomToken(20);
      const { data: ticket, error: tErr } = await supabase.from('tickets').insert({
        invitation_id: inv.id,
        event_id: inv.event_id,
        attendee_id: user.id,
        qr_secret: secret,
      }).select().single();
      if (tErr) {
        if (tErr.code === '23505') {
          const { data: concurrentTicket, error: concurrentError } = await supabase
            .from('tickets')
            .select('*')
            .eq('invitation_id', inv.id)
            .maybeSingle();
          if (concurrentError) throw concurrentError;
          if (concurrentTicket?.attendee_id === user.id) {
            return res.status(200).json({
              invitation: updated,
              ticket: { ...concurrentTicket, qr_token: ticketToken(concurrentTicket) },
            });
          }
        }
        throw tErr;
      }
      return res.status(201).json({ invitation: updated, ticket: { ...ticket, qr_token: ticketToken(ticket) } });
    }

    if (req.method === 'DELETE') {
      const user = await requireUser(req, res); if (!user) return;
      const { token } = req.body || {};
      if (!token) return res.status(400).json({ error: 'token required' });
      const { data: inv } = await supabase.from('invitations').select('*').eq('token', token).maybeSingle();
      if (!inv) return res.status(404).json({ error: 'Not found' });
      const { data, error } = await supabase.from('invitations').update({ status: 'declined' }).eq('id', inv.id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('invite-lookup error', err);
    return res.status(500).json({ error: err.message });
  }
}
