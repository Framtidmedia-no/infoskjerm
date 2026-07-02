"use server"

import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/admin/audit"
import { TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile/verify"

interface LoginInput {
  email: string
  password: string
  turnstileToken: string
}

/**
 * Logger inn med e-post/passord. Turnstile-tokenet sendes som captchaToken til
 * Supabase Auth, som verifiserer det mot Cloudflare (Dashboard → Auth → Attack
 * Protection). Tokens er engangs — derfor verifiserer vi IKKE selv i tillegg
 * her; dobbel verifisering ville konsumert tokenet før Supabase fikk sett det.
 * Server-klienten setter sesjonscookies via @supabase/ssr, og vellykket
 * innlogging audit-logges (best-effort).
 */
export async function loginWithPassword(
  input: LoginInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.turnstileToken) return { ok: false, error: TURNSTILE_ERROR_MESSAGE }

  const email = input.email.trim().toLowerCase()
  if (!email || !input.password) return { ok: false, error: "Fyll inn e-post og passord." }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: input.password,
    options: { captchaToken: input.turnstileToken },
  })
  if (error || !data.user) {
    const captchaRejected =
      error?.code === "captcha_failed" || (error?.message.toLowerCase().includes("captcha") ?? false)
    if (captchaRejected) return { ok: false, error: TURNSTILE_ERROR_MESSAGE }
    return { ok: false, error: "Feil e-post eller passord. Prøv igjen." }
  }

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
