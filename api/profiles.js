import supabase from './db-client.js';

async function getUser(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const q = String(req.query.q || '').trim();
    const limit = Math.min(30, Math.max(5, Number(req.query.limit) || 16));

    let query = supabase
      .from('profiles')
      .select('id, user_id, email, display_name, username')
      .order('display_name', { ascending: true })
      .limit(limit);

    if (q) {
      const like = `%${q.replace(/[%_,]/g, '')}%`;
      query = query.or(`email.ilike.${like},display_name.ilike.${like},username.ilike.${like}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []).filter((p) => p.user_id !== user.id);
    return res.status(200).json(rows);
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
