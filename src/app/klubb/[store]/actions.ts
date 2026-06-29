"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/admin/audit"

/**
 * Public customer-club sign-up. Called from the per-store landing page (no auth).
 * Runs server-side with the service role, so the members table stays private.
 */
export async function joinKundeklubb(
  storeId: string,
  input: { name: string; phone: string; email: string; consent: boolean }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim()
  const phone = input.phone.trim()
  const email = input.email.trim()
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
