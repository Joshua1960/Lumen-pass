import crypto from 'crypto';
import supabase from './db-client.js';

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export async function requireUser(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) { res.status(401).json({ error: 'Not signed in' }); return null; }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) { res.status(401).json({ error: 'Invalid session' }); return null; }
  return data.user;
}

export async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function requireProfile(req, res, roles) {
  const user = await requireUser(req, res);
  if (!user) return null;
  const profile = await loadProfile(user.id);
  if (!profile) { res.status(403).json({ error: 'Profile not initialized' }); return null; }
  if (roles && !roles.includes(profile.role)) { res.status(403).json({ error: 'Forbidden for this role' }); return null; }
  return { user, profile };
}

export function randomToken(len = 24) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  while (token.length < len) {
    const bytes = crypto.randomBytes(Math.ceil((len - token.length) * 1.1));
    for (const byte of bytes) {
      if (byte >= 252) continue;
      token += alphabet[byte % alphabet.length];
      if (token.length === len) break;
    }
  }
  return token;
}
