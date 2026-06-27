// Public Supabase connection values for the Gange-Rolv infoskjerm project.
//
// These are PUBLIC, non-secret values: the anon key is shipped to every browser
// and all data access is enforced by Row Level Security. Supabase explicitly
// supports committing these. Env vars take precedence, so they can be overridden
// in Vercel without any code change.
//
// The secret service_role key (which bypasses RLS) is NEVER placed here.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://fcxwrfmdvfjulhoebceq.supabase.co"

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjeHdyZm1kdmZqdWxob2ViY2VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NTcwMTUsImV4cCI6MjA5ODEzMzAxNX0.4G0Ru6LRyCDflq-pfnpYVo_2zxo9jCyBD5jRpj6L-tQ"
