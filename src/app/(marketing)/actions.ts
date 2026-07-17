"use server"

import { createAdminClient } from "@/lib/supabase/server"
import { verifyTurnstileToken, TURNSTILE_ERROR_MESSAGE } from "@/lib/turnstile/verify"
import { sendLeadNotification } from "@/lib/email/resend"
import { getMarketingContent } from "@/lib/marketing/content"

type LeadResult = { ok: true } | { ok: false; error: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_LEADS_PER_HOUR = 20

export interface LeadInput {
  name: string
  company: string
  email: string
  phone: string
  scope: string
  message: string
  turnstileToken: string | null
}

/**
 * Tar imot en henvendelse fra kontaktskjemaet på forsiden: Turnstile-vakt,
 * enkel takstsperre, rad i marketing_leads (service-role — tabellen har ingen
 * offentlige policies) og e-postvarsel til adressen CMS-et peker på.
 */
export async function submitLead(input: LeadInput): Promise<LeadResult> {
  const name = input.name.trim().slice(0, 120)
  const company = input.company.trim().slice(0, 160)
  const email = input.email.trim().toLowerCase().slice(0, 200)
  const phone = input.phone.trim().slice(0, 40)
  const scope = input.scope.trim().slice(0, 200)
  const message = input.message.trim().slice(0, 4000)

  if (!name) return { ok: false, error: "Skriv inn navnet ditt" }
  if (!EMAIL_PATTERN.test(email)) return { ok: false, error: "Skriv inn en gyldig e-postadresse" }
  if (!message && !scope) return { ok: false, error: "Fortell oss kort hva det gjelder" }

  const passed = await verifyTurnstileToken(input.turnstileToken)
  if (!passed) return { ok: false, error: TURNSTILE_ERROR_MESSAGE }

  const admin = createAdminClient()

  // Enkel sikring mot masseinnsending — Turnstile tar bots, denne tar volum.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await (admin.from("marketing_leads" as never) as unknown as {
    select: (cols: string, opts: { count: "exact"; head: true }) => {
      gte: (col: string, value: string) => Promise<{ count: number | null }>
    }
  })
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneHourAgo)
  if ((count ?? 0) >= MAX_LEADS_PER_HOUR) {
    return { ok: false, error: "Vi har uvanlig stor pågang akkurat nå. Prøv igjen om en liten stund, eller send e-post til hei@framtidtech.no." }
  }

  const { error } = await (admin.from("marketing_leads" as never) as unknown as {
    insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }).insert({ name, company, email, phone, scope, message })
  if (error) {
    console.error("marketing_leads insert feilet:", error.message)
    return { ok: false, error: "Kunne ikke sende henvendelsen. Prøv igjen, eller send e-post til hei@framtidtech.no." }
  }

  // Varselet er best-effort — henvendelsen ligger trygt i tabellen uansett.
  try {
    const { cta } = await getMarketingContent()
    const recipient = cta?.extra.lead_recipient || "hei@framtidtech.no"
    await sendLeadNotification({ to: recipient, name, company, email, phone, scope, message })
  } catch (err) {
    console.error("Lead-varsel feilet (henvendelsen er lagret):", err)
  }

  return { ok: true }
}
