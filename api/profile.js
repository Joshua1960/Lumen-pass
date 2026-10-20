import supabase from './db-client.js';
import { cors, requireUser } from './_auth.js';
import { friendlyError } from './friendly-error.js';

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  const user = await requireUser(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      const { data: existing, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (existing) return res.status(200).json(existing);
      // Auto-create from user metadata
      const md = user.user_metadata || {};
      const row = {
        user_id: user.id,
        email: user.email,
        display_name: md.display_name || user.email?.split('@')[0] || 'Guest',
        role: md.role === 'host' ? 'host' : 'attendee',
      };
      const { data, error } = await supabase
        .from('profiles')
        .upsert(row, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { display_name, role, email } = req.body || {};
      const row = {
        user_id: user.id,
        email: email || user.email,
        display_name: display_name || 'Guest',
        role: role === 'host' ? 'host' : 'attendee',
      };
      const { data, error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' }).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { display_name } = req.body || {};
      if (typeof display_name !== 'string' || !display_name.trim()) {
        return res.status(400).json({ error: 'display_name is required' });
      }
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name: display_name.trim() })
        .eq('user_id', user.id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('profile error', err);
    return res.status(500).json({ error: friendlyError(err) });
  }
}
