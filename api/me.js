import supabase from './db-client.js';

function slugFromEmail(email) {
  return String(email || '')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 24) || 'guest';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: existing } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (req.method === 'GET') {
      return res.status(200).json(existing || null);
    }

    if (req.method === 'POST') {
      const email = (user.email || '').toLowerCase();
      const displayName =
        String(req.body?.display_name || '').trim() ||
        existing?.display_name ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        email.split('@')[0];
      const username =
        String(req.body?.username || '').trim().replace(/[^a-zA-Z0-9._-]/g, '') ||
        existing?.username ||
        slugFromEmail(email);

      if (existing) {
        const patch = {};
        if (req.body?.display_name) patch.display_name = displayName;
        if (req.body?.username) patch.username = username;
        if (email && existing.email !== email) patch.email = email;
        if (!Object.keys(patch).length) return res.status(200).json(existing);
        const { data, error } = await supabase
          .from('profiles')
          .update(patch)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          email,
          display_name: displayName,
          username,
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
