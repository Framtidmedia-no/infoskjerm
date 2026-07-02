"use server"

import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/admin/audit"
import { verifyTurnstileToken, TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile/verify"

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

  return { ok: true }
}
