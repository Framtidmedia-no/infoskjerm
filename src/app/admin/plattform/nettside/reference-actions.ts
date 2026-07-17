"use server"

import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"
import { createAdminClient } from "@/lib/supabase/server"

type ActionResult = { ok: true } | { ok: false; error: string }

export interface ReferenceInput {
  company_name: string
  quote: string
  contact_name: string
  contact_role: string
  logo_url: string
  screenshot_url: string
  sort_order: number
}

function clean(input: ReferenceInput) {
  return {
    company_name: input.company_name.trim().slice(0, 160),
    quote: input.quote.trim().slice(0, 600),
    contact_name: input.contact_name.trim().slice(0, 120),
    contact_role: input.contact_role.trim().slice(0, 120),
    logo_url: input.logo_url.trim().slice(0, 500),
    screenshot_url: input.screenshot_url.trim().slice(0, 500),
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
  }
}

export async function updateReference(id: string, input: ReferenceInput): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const values = clean(input)
  if (!values.company_name) return { ok: false, error: "Firmanavn mangler" }

  const admin = createAdminClient()
  const { error } = await (admin.from("marketing_references" as never) as unknown as {
    update: (v: Record<string, unknown>) => {
      eq: (c: string, val: string) => Promise<{ error: { message: string } | null }>
    }
  })
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: "marketing.reference_update",
    entityType: "marketing_reference",
    entityId: id,
    summary: `Oppdaterte referansen «${values.company_name}»`,
  })
  revalidatePath("/")
  revalidatePath("/admin/plattform/nettside")
  return { ok: true }
}

export async function createReference(input: ReferenceInput): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const values = clean(input)
  if (!values.company_name) return { ok: false, error: "Firmanavn mangler" }

  const admin = createAdminClient()
  const { error } = await (admin.from("marketing_references" as never) as unknown as {
    insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }).insert(values)
  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: "marketing.reference_create",
    entityType: "marketing_reference",
    summary: `La til referansen «${values.company_name}»`,
  })
  revalidatePath("/admin/plattform/nettside")
  return { ok: true }
}

/**
 * Publiser/avpubliser. Databasetriggeren nekter publisering uten consented_at,
 * men vi sjekker også her for en tydelig feilmelding i UI-et.
 */
export async function setReferencePublished(id: string, published: boolean): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const admin = createAdminClient()

  if (published) {
    const { data } = await (admin.from("marketing_references" as never) as unknown as {
      select: (c: string) => {
        eq: (col: string, v: string) => { maybeSingle: () => Promise<{ data: { consented_at: string | null; company_name: string } | null }> }
      }
    })
      .select("consented_at, company_name")
      .eq("id", id)
      .maybeSingle()
    if (!data?.consented_at) {
      return { ok: false, error: "Kan ikke publiseres før kunden har signert samtykket." }
    }
  }

  const { error } = await (admin.from("marketing_references" as never) as unknown as {
    update: (v: Record<string, unknown>) => {
      eq: (c: string, val: string) => Promise<{ error: { message: string } | null }>
    }
  })
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: published ? "marketing.reference_publish" : "marketing.reference_unpublish",
    entityType: "marketing_reference",
    entityId: id,
    summary: published ? "Publiserte en kundereferanse" : "Avpubliserte en kundereferanse",
  })
  revalidatePath("/")
  revalidatePath("/admin/plattform/nettside")
  return { ok: true }
}

export async function deleteReference(id: string): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const admin = createAdminClient()
  const { error } = await (admin.from("marketing_references" as never) as unknown as {
    delete: () => { eq: (c: string, v: string) => Promise<{ error: { message: string } | null }> }
  })
    .delete()
    .eq("id", id)
  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: "marketing.reference_delete",
    entityType: "marketing_reference",
    entityId: id,
    summary: "Slettet en kundereferanse",
  })
  revalidatePath("/")
  revalidatePath("/admin/plattform/nettside")
  return { ok: true }
}
