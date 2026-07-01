import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// ============================================================
// Cliente admin (Service Role) — bypassa RLS.
// Uso exclusivo em rotas de servidor sem sessão de usuário,
// como cron jobs e webhooks (ex: sincronização automática da Meta API).
// NUNCA importar este client em código que roda no browser.
// ============================================================
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
