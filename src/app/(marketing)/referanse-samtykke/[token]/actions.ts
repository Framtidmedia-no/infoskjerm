"use server"

import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/server"
import { consentScopeSnapshot } from "@/lib/marketing/consent-text"

type ConsentResult = { ok: true } | { ok: false; error: string }

/**
 * Registrerer et signert referanse-samtykke: skriver signaturlogg + setter
 * consented_at/-by på referansen. Publisering gjøres separat i admin (og
 * databasetriggeren nekter uansett publisering uten consented_at).
 */
export async function signReferenceConsent(input: {
  token: string
  signedByName: string
}): Promise<ConsentResult> {
  const name = input.signedByName.trim().slice(0, 120)
  if (name.length < 2) return { ok: false, error: "Skriv inn fullt navn for å signere" }

  const admin = createAdminClient()

  const { data: ref } = await (admin.from("marketing_references" as never) as unknown as {
    select: (c: string) => {
      eq: (col: string, v: string) => { maybeSingle: () => Promise<{ data: { id: string; consented_at: string | null } | null }> }
    }
  })
    .select("id, consented_at")
    .eq("consent_token", input.token)
    .maybeSingle()

  if (!ref) return { ok: false, error: "Ugyldig eller utløpt samtykke-lenke" }
  if (ref.consented_at) return { ok: true } // allerede signert — idempotent

  const hdrs = await headers()
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const userAgent = hdrs.get("user-agent") ?? null
  const scope = consentScopeSnapshot()

  const { error: logError } = await (admin.from("reference_consents" as never) as unknown as {
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }).insert({
    reference_id: ref.id,
    signed_by_name: name,
    signed_scope: scope,
    ip,
    user_agent: userAgent,
  })
  if (logError) return { ok: false, error: "Kunne ikke lagre signaturen. Prøv igjen." }

  const { error: refError } = await (admin.from("marketing_references" as never) as unknown as {
    update: (v: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>
    }
  })
    .update({ consented_at: new Date().toISOString(), consented_by_name: name, consent_ip: ip, updated_at: new Date().toISOString() })
    .eq("id", ref.id)
  if (refError) return { ok: false, error: "Signaturen ble lagret, men referansen kunne ikke oppdateres. Kontakt oss på hei@framtidtech.no." }

  return { ok: true }
}
