import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?.replace(/\/+$/, "")
  .replace(/\/rest\/v1$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured for the API",
  );
}

const supabase = createClient(
  supabaseUrl,
  serviceKey,
);

export default supabase;
