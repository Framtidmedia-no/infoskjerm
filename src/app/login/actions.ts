"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/admin/audit"
import { verifyTurnstileToken, TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile/verify"
import { setTenantBrandHint } from "@/lib/tenant/brand-hint"

interface LoginInput {
  email: string
  password: string
  turnstileToken: string
}

/**
 * Logger inn med e-post/passord etter bestått Turnstile-sjekk. Kjøres som
 * server action slik at bot-sjekken håndheves på serveren; server-klienten
 * setter sesjonscookies via @supabase/ssr. Vellykket innlogging audit-logges
 * (best-effort).
 */
export async function loginWithPassword(
  input: LoginInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const human = await verifyTurnstileToken(input.turnstileToken)
  if (!human) return { ok: false, error: TURNSTILE_ERROR_MESSAGE }

  const email = input.email.trim().toLowerCase()
  if (!email || !input.password) return { ok: false, error: "Fyll inn e-post og passord." }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: input.password })
  if (error || !data.user) return { ok: false, error: "Feil e-post eller passord. Prøv igjen." }

  await logAudit({
    userId: data.user.id,
    userEmail: data.user.email ?? null,
    action: "auth.login",
    entityType: "auth",
    entityId: data.user.id,
    summary: "Logget inn",
  })

  // Husk tenanten på enheten så neste login-besøk viser tenant-branding.
  try {
    const admin = createAdminClient()
    const { data: profile } = await admin.from("users").select("tenant_id").eq("id", data.user.id).maybeSingle()
    await setTenantBrandHint(profile?.tenant_id ?? null)
  } catch {}

  return { ok: true }
}
