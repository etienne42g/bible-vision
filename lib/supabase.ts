import { createClient } from "@supabase/supabase-js";

// These are public browser credentials for the same Supabase project as Ancre.
// Environment variables can override them without changing the application code.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://supabasekong-dnxiw785ojzbrcw230qqlaq4.82.64.108.2.sslip.io";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc4NTY5NzQ0MCwiZXhwIjo0OTQxMzcxMDQwLCJyb2xlIjoiYW5vbiJ9.WTTi__9_tZLsEB4Pg2o18XfiyRTGbcPeX5x3onWn_5k";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
    storageKey: "bible-vision-ancre-auth",
  },
});
