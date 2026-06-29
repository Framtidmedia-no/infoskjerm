import { fetchLiveContent, type LiveItem } from "@/lib/content/live"
import { createAdminClient } from "@/lib/supabase/server"
import { TilbudRotator } from "./tilbud-rotator"
import type { ChainBrand } from "./offer-card"

/**
 * Full-screen offer presentation embedded into a per-store Xibo "Tilbud" layout.
 * A left side panel carries the heading/period/text; the poster or PDF fills the
 * rest; a bottom ticker shows when active. The layout is only scheduled onto a
 * store's screen while that store has active offers (see lib/xibo/offers.ts),
 * so this page normally always has something to show.
 *
 * The store's chain (EUROSPAR/SPAR/JOKER) drives the logo on the offer card, so
 * each store shows its own chain's branding.
 *
 * Usage: /widget/tilbud?store=<storeId>
 */

export const dynamic = "force-dynamic"

interface StoreChainRow {
  name: string
  chains: { name: string; logo_url: string | null; color: string; brand_fg: string | null } | null
}

export default async function TilbudWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const supabase = createAdminClient()

  const [items, storeRow] = await Promise.all([
    fetchLiveContent(store ?? null, ["slide"], "kunde"),
    store
      ? supabase.from("stores").select("name, chains(name, logo_url, color, brand_fg)").eq("id", store).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const row = storeRow.data as unknown as StoreChainRow | null
  const storeName = row?.name ?? null
  const chainRow = row?.chains ?? null
  const chain: ChainBrand | null = chainRow
    ? { name: chainRow.name, logoUrl: chainRow.logo_url, color: chainRow.color, brandFg: chainRow.brand_fg }
    : null

  // Customer screens never show the ticker.
  return <TilbudRotator items={items as LiveItem[]} ticker={[]} storeName={storeName} chain={chain} />
}
