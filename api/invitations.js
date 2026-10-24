import supabase from './db-client.js';
import { cors, requireProfile, requireUser, loadProfile, randomToken } from './_auth.js';
import { ticketToken } from './_qr.js';
import { friendlyError } from './friendly-error.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const user = await requireUser(req, res); if (!user) return;
      const profile = await loadProfile(user.id);
      if (!profile) return res.status(403).json({ error: 'Profile not initialized' });

      const { event_id, scope } = req.query;

      if (scope === 'mine') {
        // Attendee: their invitations by email OR claimed_by
        const { data: invs, error } = await supabase
          .from('invitations')
          .select('*')
          .or(`guest_email.eq.${user.email},claimed_by.eq.${user.id}`)
          .order('created_at', { ascending: false });
        if (error) throw error;
        // Attach event
        const eventIds = [...new Set(invs.map(i => i.event_id))];
        let events = [];
        if (eventIds.length) {
          const { data } = await supabase.from('events').select('*').in('id', eventIds);
          events = data || [];
        }
        const byId = Object.fromEntries(events.map(e => [e.id, e]));
        return res.status(200).json(invs.map(i => ({ ...i, event: byId[i.event_id] || null })));
      }

      if (!event_id) return res.status(400).json({ error: 'event_id required' });
      if (profile.role !== 'host') return res.status(403).json({ error: 'Hosts only' });
      // Verify ownership
      const { data: ev } = await supabase.from('events').select('id').eq('id', event_id).eq('host_id', user.id).maybeSingle();
      if (!ev) return res.status(404).json({ error: 'Event not found' });
      const { data: invs, error } = await supabase.from('invitations').select('*').eq('event_id', event_id).order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(invs);
    }

    if (req.method === 'POST') {
      const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;
      const { event_id, guest_name, guest_email, plus_ones } = req.body || {};
      if (!event_id || !guest_name || !guest_email) return res.status(400).json({ error: 'event_id, guest_name, guest_email required' });
      // Verify event ownership
      const { data: ev } = await supabase.from('events').select('id, capacity').eq('id', event_id).eq('host_id', ctx.user.id).maybeSingle();
      if (!ev) return res.status(404).json({ error: 'Event not found' });
      const token = randomToken(28);
      const row = {
        event_id,
        token,
        guest_name: guest_name.trim(),
        guest_email: guest_email.trim().toLowerCase(),
        plus_ones: Math.max(0, Math.min(10, Number(plus_ones) || 0)),
        status: 'pending',
      };
      const { data, error } = await supabase.from('invitations').insert(row).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;
      const { id, status } = req.body || {};
      if (!id || !['accepted', 'declined'].includes(status)) {
        return res.status(400).json({ error: 'id and a valid review status are required.' });
      }

      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .select('id, event_id, status')
        .eq('id', id)
        .maybeSingle();
      if (invitationError) throw invitationError;
      if (!invitation) return res.status(404).json({ error: 'Request not found.' });

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('id')
        .eq('id', invitation.event_id)
        .eq('host_id', ctx.user.id)
        .maybeSingle();
      if (eventError) throw eventError;
      if (!event) return res.status(403).json({ error: 'Forbidden' });
      if (invitation.status !== 'requested') {
        return res.status(409).json({ error: 'This request has already been reviewed.' });
      }

      if (status === 'declined') {
        const { data: updated, error } = await supabase
          .from('invitations')
          .update({ status: 'declined' })
          .eq('id', id)
          .eq('status', 'requested')
          .select()
          .maybeSingle();
        if (error) throw error;
        if (!updated) return res.status(409).json({ error: 'This request has already been reviewed.' });
        return res.status(200).json({ invitation: updated });
      }

      const { data: approval, error: approvalError } = await supabase.rpc(
        'approve_public_interest_with_capacity',
        { p_invitation_id: String(id), p_qr_secret: randomToken(40) },
      );
      if (approvalError) throw approvalError;
      if (!approval?.accepted) {
        const messages = {
          not_found: 'Request not found.',
          not_requested: 'This request has already been reviewed.',
          capacity_reached: 'The event has reached capacity.',
          capacity_not_configured: 'This event does not have a valid capacity configured.',
        };
        const code = approval?.reason === 'not_found' ? 404 : 409;
        return res.status(code).json({
          error: messages[approval?.reason] || 'This request could not be approved.',
        });
      }

      const [{ data: updated, error: updatedError }, { data: ticket, error: ticketError }] =
        await Promise.all([
          supabase.from('invitations').select('*').eq('id', id).single(),
          supabase.from('tickets').select('*').eq('invitation_id', id).single(),
        ]);
      if (updatedError) throw updatedError;
      if (ticketError) throw ticketError;
      return res.status(200).json({
        invitation: updated,
        ticket: { ...ticket, qr_token: ticketToken(ticket) },
      });
    }

    if (req.method === 'DELETE') {
      const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });
      // Verify invitation belongs to host's event
      const { data: inv } = await supabase.from('invitations').select('event_id').eq('id', id).maybeSingle();
      if (!inv) return res.status(404).json({ error: 'Not found' });
      const { data: ev } = await supabase.from('events').select('id').eq('id', inv.event_id).eq('host_id', ctx.user.id).maybeSingle();
      if (!ev) return res.status(403).json({ error: 'Forbidden' });
      // Delete associated tickets & scan logs first
      const { data: tks } = await supabase.from('tickets').select('id').eq('invitation_id', id);
      const tIds = (tks || []).map(t => t.id);
      if (tIds.length) await supabase.from('scan_logs').delete().in('ticket_id', tIds);
      await supabase.from('tickets').delete().eq('invitation_id', id);
      await supabase.from('invitations').delete().eq('id', id);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('invitations error', err);
    return res.status(500).json({ error: friendlyError(err) });
  }
}
