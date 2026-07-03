"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/admin/audit"
import { verifyTurnstileToken, TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile/verify"

// Lengdegrenser for uautentisert, offentlig innsending (hindrer spam/store payloads).
const MAX_NAME = 120
const MAX_PHONE = 40
const MAX_EMAIL = 200

/**
 * Public customer-club sign-up. Called from the per-store landing page (no auth).
 * Runs server-side with the service role, so the members table stays private.
 * Turnstile-verifisert (som påmeldingsflyten) og felt-lengder cappes, siden dette
 * er et uautentisert skrive-endepunkt.
 */
export async function joinKundeklubb(
  storeId: string,
  input: { name: string; phone: string; email: string; consent: boolean; turnstileToken: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const human = await verifyTurnstileToken(input.turnstileToken)
  if (!human) return { ok: false, error: TURNSTILE_ERROR_MESSAGE }

  const name = input.name.trim().slice(0, MAX_NAME)
  const phone = input.phone.trim().slice(0, MAX_PHONE)
  const email = input.email.trim().slice(0, MAX_EMAIL)
  if (!name) return { ok: false, error: "Skriv inn navnet ditt" }
  if (!phone && !email) return { ok: false, error: "Oppgi mobilnummer eller e-post" }
  if (!input.consent) return { ok: false, error: "Du må godta vilkårene for å bli med" }

  const supabase = createAdminClient()
  const { data: store } = await supabase.from("stores").select("id, tenant_id, name").eq("id", storeId).maybeSingle()
  if (!store) return { ok: false, error: "Fant ikke butikken" }

  const { error } = await supabase.from("kundeklubb_members").insert({
    store_id: store.id,
    tenant_id: store.tenant_id,
    name,
    phone: phone || null,
    email: email || null,
    consent: true,
  })
  if (error) return { ok: false, error: "Noe gikk galt — prøv igjen" }

  await logAudit({ action: "kundeklubb.join", entityType: "kundeklubb", entityId: store.id, summary: `Ny kundeklubb-påmelding (${store.name})` })
  return { ok: true }
}
