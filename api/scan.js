import supabase from './db-client.js';
import { cors, requireProfile } from './_auth.js';
import { verifyTicket } from './_qr.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const ctx = await requireProfile(req, res, ['host']); if (!ctx) return;

    if (req.method === 'GET') {
      const { event_id, limit } = req.query;
      if (!event_id) return res.status(400).json({ error: 'event_id required' });
      const { data: ev } = await supabase.from('events').select('id').eq('id', event_id).eq('host_id', ctx.user.id).maybeSingle();
      if (!ev) return res.status(404).json({ error: 'Event not found' });
      const cap = Math.min(200, Math.max(1, Number(limit) || 50));
      const { data, error } = await supabase.from('scan_logs').select('*').eq('event_id', event_id).order('created_at', { ascending: false }).limit(cap);
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { event_id, raw } = req.body || {};
      if (!event_id || !raw) return res.status(400).json({ error: 'event_id and raw required' });

      const { data: ev } = await supabase.from('events').select('id, title, host_id').eq('id', event_id).eq('host_id', ctx.user.id).maybeSingle();
      if (!ev) return res.status(404).json({ error: 'Event not found' });

      const logRow = { event_id, ticket_id: null, result: 'invalid', guest_name: null, scanner_id: ctx.user.id };

      const payload = verifyTicket(raw);
      if (!payload) {
        await supabase.from('scan_logs').insert(logRow);
        return res.status(200).json({ result: 'invalid', message: 'Signature invalid. Not a Lumen pass.' });
      }
      if (payload.e !== event_id) {
        await supabase.from('scan_logs').insert(logRow);
        return res.status(200).json({ result: 'invalid', message: 'This pass is for another event.' });
      }

      const { data: ticket } = await supabase.from('tickets').select('*').eq('id', payload.t).maybeSingle();
      if (!ticket || ticket.qr_secret !== payload.s || ticket.event_id !== event_id) {
        await supabase.from('scan_logs').insert(logRow);
        return res.status(200).json({ result: 'invalid', message: 'Pass could not be verified.' });
      }

      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .select('guest_name, guest_email, plus_ones, status')
        .eq('id', ticket.invitation_id)
        .maybeSingle();
      if (invError) throw invError;
      const guestName = inv?.guest_name || 'Guest';
      if (!inv || inv.status !== 'accepted') {
        logRow.ticket_id = ticket.id;
        logRow.guest_name = guestName;
        await supabase.from('scan_logs').insert(logRow);
        return res.status(200).json({
          result: 'invalid',
          guest_name: guestName,
          ticket_id: ticket.id,
          message: 'This invitation is no longer accepted.',
        });
      }

      // Atomic check-in: only update if not already checked in. Prevents race conditions on double-scan.
      const now = new Date().toISOString();
      const { data: updated, error: upErr } = await supabase
        .from('tickets')
        .update({ checked_in_at: now, checked_in_by: ctx.user.id })
        .eq('id', ticket.id)
        .is('checked_in_at', null)
        .select();
      if (upErr) throw upErr;

      if (!updated || updated.length === 0) {
        // Another scanner won the race, or the ticket was already checked in.
        const { data: fresh } = await supabase.from('tickets').select('checked_in_at').eq('id', ticket.id).maybeSingle();
        logRow.result = 'duplicate';
        logRow.ticket_id = ticket.id;
        logRow.guest_name = guestName;
        await supabase.from('scan_logs').insert(logRow);
        return res.status(200).json({
          result: 'duplicate',
          guest_name: guestName,
          ticket_id: ticket.id,
          checked_in_at: fresh?.checked_in_at || null,
          plus_ones: inv?.plus_ones || 0,
          message: 'Already inside.',
        });
      }

      logRow.result = 'valid';
      logRow.ticket_id = ticket.id;
      logRow.guest_name = guestName;
      await supabase.from('scan_logs').insert(logRow);

      return res.status(200).json({
        result: 'valid',
        guest_name: guestName,
        ticket_id: ticket.id,
        checked_in_at: now,
        plus_ones: inv?.plus_ones || 0,
        message: 'Welcome inside.',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('scan error', err);
    return res.status(500).json({ error: err.message });
  }
}
