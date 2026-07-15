import QRCode from "qrcode"
import { fetchLiveContent, type LiveItem } from "@/lib/content/live"
import { createAdminClient } from "@/lib/supabase/server"
import { seasonForStore } from "@/lib/tenant/store-features"
import { KampanjeRotator } from "./kampanje-rotator"
import type { ChainBrand } from "@/app/widget/tilbud/offer-card"

/**
 * LIGGENDE kunde-kampanjeskjerm (1920×1080) — premium plakat-mal i bilforhandler-
 * stil. Viser butikkens kunde-innhold: kampanjekort/plakater (slides), konkurranser
 * og gallerier (liggende varianter) + kunde-artikler, med kjedens branding.
 * Embeddes i en liggende Xibo-layout eller åpnes som kiosk via
 * /vis/<enhet>?orientation=liggende.
 *
 * Bruk: /widget/kampanje?store=<storeId>
 */

export const dynamic = "force-dynamic"

interface ChainRow {
  chains: { name: string; logo_url: string | null; color: string; brand_fg: string | null } | null
}

function normalizeUrl(raw: string): string {
  const v = raw.trim()
  if (!v) return ""
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

export default async function KampanjeWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string; avdeling?: string; screen?: string }> }) {
  const { store, avdeling, screen } = await searchParams
  const supabase = createAdminClient()

  const [slides, comps, galleries, articles, htmls, storeRow, season] = await Promise.all([
    fetchLiveContent(store ?? null, ["slide"], "kunde", avdeling, screen),
    fetchLiveContent(store ?? null, ["competition"], "kunde", avdeling, screen),
    fetchLiveContent(store ?? null, ["gallery"], "kunde", avdeling, screen),
    fetchLiveContent(store ?? null, ["news"], "kunde", avdeling, screen),
    // HTML-sider (sanert, vist i låst sandbox-iframe) — liggende variant.
    fetchLiveContent(store ?? null, ["html"], "kunde", avdeling, screen),
    store
      ? supabase.from("stores").select("chains(name, logo_url, color, brand_fg)").eq("id", store).maybeSingle()
      : Promise.resolve({ data: null }),
    seasonForStore(store ?? null),
  ])

  // Kampanjekort/plakater først, så konkurranse, galleri og artikler.
  const items = [
    ...(slides as LiveItem[]),
    ...(htmls as LiveItem[]),
    ...(comps as LiveItem[]),
    ...(galleries as LiveItem[]),
    ...(articles as LiveItem[]),
  ]

  // QR-koder: konkurranser/artikler med lenke (applyUrl) + gallerier (qrUrl).
  const qr: Record<string, string> = {}
  for (const it of [...(comps as LiveItem[]), ...(articles as LiveItem[])]) {
    if (it.applyUrl?.trim()) {
      try {
        qr[it.id] = await QRCode.toDataURL(normalizeUrl(it.applyUrl), { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#ffffff" } })
      } catch { /* best-effort */ }
    }
  }
  for (const it of galleries as LiveItem[]) {
    if (it.gallery?.qrUrl?.trim()) {
      try {
        qr[it.id] = await QRCode.toDataURL(normalizeUrl(it.gallery.qrUrl), { margin: 1, width: 360, color: { dark: "#0a0a0a", light: "#ffffff" } })
      } catch { /* best-effort */ }
    }
  }

  const row = storeRow.data as unknown as ChainRow | null
  const chainRow = row?.chains ?? null
  const chain: ChainBrand | null = chainRow
    ? { name: chainRow.name, logoUrl: chainRow.logo_url, color: chainRow.color, brandFg: chainRow.brand_fg }
    : null

  return <KampanjeRotator items={items} chain={chain} qr={qr} season={season} />
}
