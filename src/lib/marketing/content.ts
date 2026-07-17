import { createAdminClient } from "@/lib/supabase/server"

/**
 * Innhold for den offentlige produktsiden (/). Alt kunde-redigerbart bor i
 * marketing_blocks + marketing_prices (se migrasjon 20260717190000) og
 * redigeres under /admin/plattform/nettside. Lesing skjer med service-role
 * server-side — siden viser ingen brukerdata.
 */

export type MarketingBlockKind =
  | "hero"
  | "fact"
  | "stage"
  | "hardware"
  | "pricing"
  | "cta"
  | "footer"
  | "seo"
  | "page"

export interface MarketingBlock {
  id: string
  kind: MarketingBlockKind
  title: string
  body: string
  extra: Record<string, string>
  sort_order: number
}

export interface MarketingPrice {
  id: string
  product: string
  period: string
  quantity_label: string
  price_nok: number
  unit: string
  sort_order: number
  active: boolean
}

export interface MarketingContent {
  hero: MarketingBlock | null
  facts: MarketingBlock[]
  stages: MarketingBlock[]
  hardware: MarketingBlock | null
  pricing: MarketingBlock | null
  cta: MarketingBlock | null
  footer: MarketingBlock | null
  seo: MarketingBlock | null
  pages: MarketingBlock[]
  prices: MarketingPrice[]
}

// Tabellene er nyere enn den genererte Database-typen → cast som tenants.ts
// gjør for tenants-utvidelser.
type BlockRow = {
  id: string
  kind: string
  title: string
  body: string
  extra: unknown
  sort_order: number
}

type PriceRow = {
  id: string
  product: string
  period: string
  quantity_label: string
  price_nok: number
  unit: string
  sort_order: number
  active: boolean
}

function mapBlock(row: BlockRow): MarketingBlock {
  const extra: Record<string, string> = {}
  if (row.extra && typeof row.extra === "object" && !Array.isArray(row.extra)) {
    for (const [key, value] of Object.entries(row.extra as Record<string, unknown>)) {
      if (typeof value === "string") extra[key] = value
    }
  }
  return {
    id: row.id,
    kind: row.kind as MarketingBlockKind,
    title: row.title,
    body: row.body,
    extra,
    sort_order: row.sort_order,
  }
}

export async function getMarketingContent(): Promise<MarketingContent> {
  const admin = createAdminClient()

  const [blocksRes, pricesRes] = await Promise.all([
    (admin.from("marketing_blocks" as never) as unknown as {
      select: (cols: string) => {
        order: (col: string) => Promise<{ data: BlockRow[] | null; error: { message: string } | null }>
      }
    })
      .select("id, kind, title, body, extra, sort_order")
      .order("sort_order"),
    (admin.from("marketing_prices" as never) as unknown as {
      select: (cols: string) => {
        order: (col: string) => Promise<{ data: PriceRow[] | null; error: { message: string } | null }>
      }
    })
      .select("id, product, period, quantity_label, price_nok, unit, sort_order, active")
      .order("sort_order"),
  ])

  if (blocksRes.error) throw new Error(blocksRes.error.message)
  if (pricesRes.error) throw new Error(pricesRes.error.message)

  const blocks = (blocksRes.data ?? []).map(mapBlock)
  const byKind = (kind: MarketingBlockKind) => blocks.filter((b) => b.kind === kind)
  const oneOf = (kind: MarketingBlockKind) => byKind(kind)[0] ?? null

  return {
    hero: oneOf("hero"),
    facts: byKind("fact"),
    stages: byKind("stage"),
    hardware: oneOf("hardware"),
    pricing: oneOf("pricing"),
    cta: oneOf("cta"),
    footer: oneOf("footer"),
    seo: oneOf("seo"),
    pages: byKind("page"),
    prices: pricesRes.data ?? [],
  }
}

/** Undersider (/personvern, /vilkar) — slug ligger i extra.slug. */
export async function getMarketingPageBySlug(slug: string): Promise<MarketingBlock | null> {
  const { pages } = await getMarketingContent()
  return pages.find((page) => page.extra.slug === slug) ?? null
}

/** «2 990» — norsk tusenskille (smalt mellomrom) for plakat-tallene. */
export function formatNok(value: number): string {
  return new Intl.NumberFormat("nb-NO").format(value)
}
