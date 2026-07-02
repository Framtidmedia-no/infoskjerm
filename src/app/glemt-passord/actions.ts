"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { getBaseUrl } from "@/lib/base-url"
import { sendPasswordResetEmail } from "@/lib/email/resend"
import { verifyTurnstileToken, TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile/verify"

// Sender en passord-tilbakestillingslenke. Returnerer alltid ok (uten å avsløre
// om e-posten finnes) for å unngå brukerenumerering. Turnstile-avslag er
// unntaket — det gjelder innsenderen, ikke kontoen, og vises som feil.
export async function requestPasswordReset(email: string, turnstileToken: string) {
  const human = await verifyTurnstileToken(turnstileToken)
  if (!human) return { ok: false, error: TURNSTILE_ERROR_MESSAGE }

  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail) return { ok: false, error: "E-post mangler" }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: cleanEmail,
  })

  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) {
    // Bruker finnes trolig ikke — svar likt som ved suksess.
    return { ok: true }
  }

  const base = await getBaseUrl()
  const link = `${base}/auth/callback?token_hash=${tokenHash}&type=recovery&next=${encodeURIComponent("/velkommen")}`
  try {
    await sendPasswordResetEmail({ to: cleanEmail, link })
  } catch {
    // Ikke lekk feil til klient; logges server-side av Resend.
    return { ok: true }
  }
  return { ok: true }
}
