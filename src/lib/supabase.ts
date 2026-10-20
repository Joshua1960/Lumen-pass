import { createClient } from "@supabase/supabase-js";

const env = import.meta.env as Record<string, string | undefined>;
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseUrl = url?.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');

if (!supabaseUrl || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be configured');
}

const supabase = createClient(supabaseUrl, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "lumen-auth",
  },
});

export default supabase;
