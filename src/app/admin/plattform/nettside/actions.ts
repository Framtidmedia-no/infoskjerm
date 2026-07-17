"use server"

import { revalidatePath } from "next/cache"
import { requireSuperAdmin } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"
import { createAdminClient } from "@/lib/supabase/server"

type ActionResult = { ok: true } | { ok: false; error: string }

/** Nøklene i extra som admin-UI-et eksponerer per blokk-type. */
const ALLOWED_EXTRA_KEYS = [
  "meta_line",
  "cta_label",
  "cta_url",
  "secondary_label",
  "secondary_url",
  "ticker_items",
  "footnote",
  "slug",
  "lead_recipient",
] as const

function sanitizeExtra(input: Record<string, string>): Record<string, string> {
  const extra: Record<string, string> = {}
  for (const key of ALLOWED_EXTRA_KEYS) {
    const value = input[key]
    if (typeof value === "string" && value.trim() !== "") extra[key] = value.trim()
  }
  return extra
}

export async function updateMarketingBlock(input: {
  id: string
  title: string
  body: string
  extra: Record<string, string>
}): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const admin = createAdminClient()

  const { error } = await (admin.from("marketing_blocks" as never) as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  })
    .update({
      title: input.title,
      body: input.body,
      extra: sanitizeExtra(input.extra),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)

  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: "marketing.block_update",
    entityType: "marketing_block",
    entityId: input.id,
    summary: `Oppdaterte nettside-blokken «${input.title.slice(0, 60)}»`,
  })
  revalidatePath("/")
  revalidatePath("/admin/plattform/nettside")
  return { ok: true }
}

interface PriceInput {
  product: string
  period: string
  quantity_label: string
  price_nok: number
  unit: string
  sort_order: number
  active: boolean
}

function validatePrice(input: PriceInput): string | null {
  if (!input.product.trim()) return "Produktnavn mangler"
  if (!input.period.trim()) return "Periode mangler"
  if (!Number.isFinite(input.price_nok) || input.price_nok < 0) return "Pris må være et tall ≥ 0"
  return null
}

export async function createMarketingPrice(input: PriceInput): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const invalid = validatePrice(input)
  if (invalid) return { ok: false, error: invalid }

  const admin = createAdminClient()
  const { error } = await (admin.from("marketing_prices" as never) as unknown as {
    insert: (values: Record<string, unknown>) => Promise<{ error: { message: string } | null }>
  }).insert({
    product: input.product.trim(),
    period: input.period.trim(),
    quantity_label: input.quantity_label.trim() || "alle",
    price_nok: Math.round(input.price_nok),
    unit: input.unit.trim() || "per skjerm",
    sort_order: input.sort_order,
    active: input.active,
  })

  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: "marketing.price_create",
    entityType: "marketing_price",
    summary: `La til nettside-prisen «${input.product.trim()}»`,
  })
  revalidatePath("/")
  revalidatePath("/admin/plattform/nettside")
  return { ok: true }
}

export async function updateMarketingPrice(id: string, input: PriceInput): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const invalid = validatePrice(input)
  if (invalid) return { ok: false, error: invalid }

  const admin = createAdminClient()
  const { error } = await (admin.from("marketing_prices" as never) as unknown as {
    update: (values: Record<string, unknown>) => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  })
    .update({
      product: input.product.trim(),
      period: input.period.trim(),
      quantity_label: input.quantity_label.trim() || "alle",
      price_nok: Math.round(input.price_nok),
      unit: input.unit.trim() || "per skjerm",
      sort_order: input.sort_order,
      active: input.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: "marketing.price_update",
    entityType: "marketing_price",
    entityId: id,
    summary: `Oppdaterte nettside-prisen «${input.product.trim()}»`,
  })
  revalidatePath("/")
  revalidatePath("/admin/plattform/nettside")
  return { ok: true }
}

export async function deleteMarketingPrice(id: string): Promise<ActionResult> {
  const { userId } = await requireSuperAdmin()
  const admin = createAdminClient()

  const { error } = await (admin.from("marketing_prices" as never) as unknown as {
    delete: () => {
      eq: (col: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  })
    .delete()
    .eq("id", id)

  if (error) return { ok: false, error: error.message }

  await logAudit({
    userId,
    action: "marketing.price_delete",
    entityType: "marketing_price",
    entityId: id,
    summary: "Slettet en nettside-pris",
  })
  revalidatePath("/")
  revalidatePath("/admin/plattform/nettside")
  return { ok: true }
}
