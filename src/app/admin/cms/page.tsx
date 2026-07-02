import { Topbar } from "@/components/admin/topbar"
import { requireRole } from "@/lib/admin/require-role"
import { fetchLiveContent } from "@/lib/content/live"
import { fetchScreensByStore, type StoreScreen } from "@/lib/xibo/screens"
import { fetchScreenInsight } from "@/lib/xibo/insight"
import { ScreenPreview, type PreviewStore } from "./screen-preview"
import { InsightPanel } from "./insight-panel"
import { ContentStatus, type ContentStatusCounts } from "./content-status"
import { RefreshKpiButton } from "./refresh-kpi-button"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { hasFeature } from "@/lib/tenant/features"

/**
 * "Skjermsystem" — the CMS user's window into what each store's screen is
 * actually showing right now, composed from the live widgets. No Xibo exposure:
 * the user previews here and never logs into the screen engine.
 */

export const dynamic = "force-dynamic"

const VIEW_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const

export default async function CmsDashboardPage() {
  const { supabase, tenantId, userId } = await requireRole([...VIEW_ROLES])
  const { unitLabel, unitLabelPlural, brand, features } = await getTenantConfig(supabase, tenantId)
  // «Oppdater KPI nå» krever Drift-synk — kun tenants med kpi-funksjonen (Gange-Rolv),
  // aldri hardkodet tenant-navn. Uten den vises knappen ikke (f.eks. Mobile AS).
  const showKpi = hasFeature(features, "kpi")

  const { data: stores } = await supabase
    .from("stores")
    .select("id, name, city, latitude, longitude")
    .eq("tenant_id", tenantId)
    .order("name")

  const list = stores ?? []

  // «I dag»-heroen: hilsen + dagens driftsbilde i én setning.
  const { data: me } = await supabase.from("users").select("full_name").eq("id", userId).maybeSingle()
  const firstName = (me?.full_name ?? "").trim().split(" ")[0] || null
  const osloHour = Number(new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "numeric", hour12: false }).format(new Date()))
  const greeting = osloHour < 5 ? "God natt" : osloHour < 10 ? "God morgen" : osloHour < 18 ? "God dag" : "God kveld"
  const todayStr = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "long", day: "numeric", month: "long" }).format(new Date())

  // Content health counts for the status strip.
  const nowMs = Date.now()
  const weekMs = nowMs + 7 * 86400000
  const { data: contentRows } = await supabase.from("content_items").select("status, valid_to").eq("tenant_id", tenantId)
  const counts: ContentStatusCounts = { live: 0, expiringSoon: 0, drafts: 0, expired: 0 }
  for (const r of contentRows ?? []) {
    if (r.status === "draft") counts.drafts++
    if (r.status === "live") {
      counts.live++
      if (r.valid_to) {
        const t = new Date(r.valid_to).getTime()
        if (t < nowMs) counts.expired++
        else if (t <= weekMs) counts.expiringSoon++
      }
    }
  }

  // Flag stores that currently have active offers (so the Tilbud tab is labelled),
  // and read live screen status per store from the engine (empty until Pis connect).
  const [hasOffers, screensByStore, insight] = await Promise.all([
    Promise.all(
      list.map((s) => fetchLiveContent(s.id, ["slide"]).then((r) => r.length > 0).catch(() => false))
    ),
    fetchScreensByStore(list).catch(() => new Map<string, StoreScreen[]>()),
    fetchScreenInsight().catch(() => ({ faults: [], topPlays: [], from: "", to: "" })),
  ])
  const previewStores: PreviewStore[] = list.map((s, i) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    lat: s.latitude,
    lon: s.longitude,
    hasOffers: hasOffers[i],
  }))
  // Plain object for the client boundary (Map isn't serializable).
  const screens: Record<string, StoreScreen[]> = Object.fromEntries(
    list.map((s) => [s.id, screensByStore.get(s.id) ?? []])
  )

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Skjermsystem"
        subtitle={`Forhåndsvis og styr hva som vises på hver ${unitLabel.toLowerCase()}s skjerm`}
        actions={showKpi ? <RefreshKpiButton /> : undefined}
      />
      <div className="flex-1 p-4 sm:p-6 max-w-5xl">
        {previewStores.length === 0 ? (
          <p className="text-sm text-zinc-500">{`Ingen ${unitLabelPlural.toLowerCase()} er satt opp ennå.`}</p>
        ) : (
          <div className="space-y-6">
            <div className="fx-rise">
              <p className="text-sm capitalize text-zinc-500">{todayStr}</p>
              <h2 className="font-display mt-1 flex items-center gap-2.5 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                {greeting}{firstName ? `, ${firstName}` : ""}
                <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 text-emerald-500">
                  <path fill="currentColor" d="M8 0c.6 4.2 3.8 7.4 8 8-4.2.6-7.4 3.8-8 8-.6-4.2-3.8-7.4-8-8 4.2-.6 7.4-3.8 8-8Z" />
                </svg>
              </h2>
              <p className="mt-1.5 text-sm text-zinc-600">
                {counts.live} innslag live · {insight.faults.length > 0 ? `${insight.faults.length} skjermfeil` : "ingen skjermfeil"} · {counts.expiringSoon} utløper denne uka
              </p>
            </div>
            <ContentStatus counts={counts} />
            <InsightPanel insight={insight} />
            <ScreenPreview stores={previewStores} screens={screens} brand={brand} />
          </div>
        )}
      </div>
    </div>
  )
}
