import { createAdminClient } from "@/lib/supabase/server"

/**
 * Kundereferanser med samtykke-gate. Offentlig visning henter KUN publiserte
 * (og bare vis-feltene). Samtykke-signering og publisering skjer med
 * service-role bak super_admin-gate / token.
 */

export interface PublicReference {
  id: string
  company_name: string
  quote: string
  contact_name: string
  contact_role: string
  logo_url: string
  screenshot_url: string
}

export interface AdminReference extends PublicReference {
  sort_order: number
  consent_token: string
  consented_at: string | null
  consented_by_name: string | null
  published: boolean
}

/** Forhåndsvisning kunden ser på samtykke-siden (uten token/ip). */
export interface ConsentPreview {
  id: string
  company_name: string
  quote: string
  contact_name: string
  contact_role: string
  logo_url: string
  screenshot_url: string
  already_signed: boolean
}

type RefRow = Record<string, unknown>

function str(v: unknown): string {
  return typeof v === "string" ? v : ""
}

/** Publiserte referanser til den offentlige forsiden. */
export async function getPublishedReferences(): Promise<PublicReference[]> {
  const admin = createAdminClient()
  const { data } = await (admin.from("marketing_references" as never) as unknown as {
    select: (cols: string) => {
      eq: (c: string, v: boolean) => {
        order: (c: string) => Promise<{ data: RefRow[] | null }>
      }
    }
  })
    .select("id, company_name, quote, contact_name, contact_role, logo_url, screenshot_url")
    .eq("published", true)
    .order("sort_order")

  return (data ?? []).map((r) => ({
    id: str(r.id),
    company_name: str(r.company_name),
    quote: str(r.quote),
    contact_name: str(r.contact_name),
    contact_role: str(r.contact_role),
    logo_url: str(r.logo_url),
    screenshot_url: str(r.screenshot_url),
  }))
}

/** Alle referanser for admin (utkast + publiserte). */
export async function listReferences(): Promise<AdminReference[]> {
  const admin = createAdminClient()
  const { data } = await (admin.from("marketing_references" as never) as unknown as {
    select: (cols: string) => {
      order: (c: string) => Promise<{ data: RefRow[] | null }>
    }
  })
    .select(
      "id, company_name, quote, contact_name, contact_role, logo_url, screenshot_url, sort_order, consent_token, consented_at, consented_by_name, published"
    )
    .order("sort_order")

  return (data ?? []).map((r) => ({
    id: str(r.id),
    company_name: str(r.company_name),
    quote: str(r.quote),
    contact_name: str(r.contact_name),
    contact_role: str(r.contact_role),
    logo_url: str(r.logo_url),
    screenshot_url: str(r.screenshot_url),
    sort_order: typeof r.sort_order === "number" ? r.sort_order : 0,
    consent_token: str(r.consent_token),
    consented_at: r.consented_at ? str(r.consented_at) : null,
    consented_by_name: r.consented_by_name ? str(r.consented_by_name) : null,
    published: r.published === true,
  }))
}

/** Forhåndsvisning ved samtykke-token (kunden ser hva de godkjenner). */
export async function getReferenceByToken(token: string): Promise<ConsentPreview | null> {
  const admin = createAdminClient()
  const { data } = await (admin.from("marketing_references" as never) as unknown as {
    select: (cols: string) => {
      eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: RefRow | null }> }
    }
  })
    .select("id, company_name, quote, contact_name, contact_role, logo_url, screenshot_url, consented_at")
    .eq("consent_token", token)
    .maybeSingle()

  if (!data) return null
  return {
    id: str(data.id),
    company_name: str(data.company_name),
    quote: str(data.quote),
    contact_name: str(data.contact_name),
    contact_role: str(data.contact_role),
    logo_url: str(data.logo_url),
    screenshot_url: str(data.screenshot_url),
    already_signed: Boolean(data.consented_at),
  }
}
