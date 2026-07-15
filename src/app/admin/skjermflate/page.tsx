import { requireRole } from "@/lib/admin/require-role"
import { fetchLiveContent, type LiveItem } from "@/lib/content/live"
import { isDeckUrl } from "@/lib/content/deck"
import { fetchScreensByStore, type StoreScreen } from "@/lib/xibo/screens"
import { fetchScreenInsight } from "@/lib/xibo/insight"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { heleEnhetenLabel } from "@/lib/tenant/config"
import { hasFeature } from "@/lib/tenant/features"
import { SkjermflateScene } from "./skjermflate-scene"
import { FleetOnboarding } from "./fleet-onboarding"
import type { FleetStore, FleetScreen, FleetStats, LiveLite, FaultLite, TopPlayLite, ContentHealth, UpcomingLite } from "./types"

/**
 * «Skjermflåte» — kinematografisk kommandosentral. Hver skjerm vises NØYAKTIG slik
 * den fysiske Pi-en spiller den: kundeskjerm → /widget/tilbud (stående, per avdeling),
 * intern/bakrom → /widget/bakrom (selv-roterende: nyheter → KPI → alle butikker;
 * KPI kun der tenanten har det). Innhold og teller respekterer butikk-målretting,
 * flate (kunde/intern), avdeling og skjerm-målretting — samme kilde widgetene bruker.
 */

export const dynamic = "force-dynamic"

const VIEW_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager"] as const
// Inkluderer «html» (HTML-side) — kom på prod etter denne branchen. Forward-
// kompatibelt: hentes/telles/listes, og stor preview går via /widget/preview
// som på prod rendrer html-typen. Ekstra typer her er ufarlige om de ikke finnes.
const ALL_TYPES = ["news", "competition", "stats", "weather", "slide", "job", "birthday", "ticker", "invitation", "gallery", "html"]

interface ScreenRow {
  id: string
  flate: "kunde" | "intern"
  avdeling: string
  orientation: "portrait" | "landscape"
  xibo_display_id: number | null
}

function toLite(item: LiveItem, previewById: Map<string, string>, thumbById: Map<string, string | null>): LiveLite {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    avdeling: item.avdeling || "felles",
    validTo: item.validTo,
    imageUrl: thumbById.get(item.id) ?? null,
    previewData: previewById.get(item.id) ?? "",
  }
}

const firstString = (arr: unknown): string | null =>
  Array.isArray(arr) ? (arr.find((x) => typeof x === "string" && x) as string | undefined) ?? null : null

/**
 * Miniatyr — NØYAKTIG samme logikk som innhold-siden (content-data.ts): kundeavis/
 * PPT → første forhåndsrendrede side (body.pages), galleri → første varebilde,
 * deck uten sider → rå-URL (PDF/PPT-ikon-fallback slår inn).
 */
function buildThumb(body: Record<string, unknown> | null): string | null {
  const b = (body ?? {}) as { imageUrl?: string | null; portraitUrl?: string | null; pages?: unknown; portraitPages?: unknown; gallery?: { items?: { imageUrl?: string | null }[] } | null }
  const deckPreview =
    b.imageUrl && isDeckUrl(b.imageUrl)
      ? firstString(b.pages)
      : !b.imageUrl && b.portraitUrl && isDeckUrl(b.portraitUrl)
        ? firstString(b.portraitPages)
        : null
  const galleryPreview = (b.gallery?.items ?? []).map((g) => g.imageUrl).find((u): u is string => !!u) ?? null
  return deckPreview ?? b.imageUrl ?? b.portraitUrl ?? galleryPreview
}

/**
 * Bygger /widget/preview-payloaden («d») fra det LAGREDE innslaget — samme felter
 * editoren koder (body lagrer `html` → PreviewData vil ha `bodyHtml`). Slik rendrer
 * previewet hvert innslag 1:1 gjennom de ekte rotorene, ikke bare råbildet.
 */
function buildPreviewData(row: { type: string; title: string; valid_from: string | null; valid_to: string | null; body: Record<string, unknown> | null }): string {
  const body = row.body ?? {}
  const d = {
    type: row.type,
    title: row.title,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    ...body,
    bodyHtml: (body.html as string | undefined) ?? "",
  }
  return Buffer.from(JSON.stringify(d)).toString("base64url")
}

export default async function SkjermflatePage() {
  const { supabase, tenantId, userId } = await requireRole([...VIEW_ROLES])
  const { unitLabel, avdelinger, avdelingerIntern, features } = await getTenantConfig(supabase, tenantId)
  // KPI-slides (butikk-KPI + alle butikker) — kun tenants med kpi-funksjonen (Gange-Rolv).
  const showKpi = hasFeature(features, "kpi")
  const heleLabel = heleEnhetenLabel(unitLabel)
  const avdLabel = (flate: "kunde" | "intern", key: string): string => {
    if (key === "felles") return heleLabel
    const list = flate === "intern" ? avdelingerIntern : avdelinger
    return list.find((a) => a.key === key)?.label ?? key
  }

  const { data: storeRows } = await supabase
    .from("stores")
    .select("id, name, city, latitude, longitude")
    .eq("tenant_id", tenantId)
    .order("name")
  const list = storeRows ?? []

  const { data: me } = await supabase.from("users").select("full_name").eq("id", userId).maybeSingle()
  const firstName = (me?.full_name ?? "").trim().split(" ")[0] || null
  const lastSync = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }).format(new Date())
  const nowIso = new Date().toISOString()

  // DB-skjermene: binder hver Xibo-display til sin flate/avdeling/orientering.
  const screenRes = await supabase.from("screens").select("id, flate, avdeling, orientation, xibo_display_id").eq("tenant_id", tenantId)
  const bindingByDisplay = new Map<number, ScreenRow>()
  for (const r of (screenRes.data ?? []) as unknown as ScreenRow[]) {
    if (r.xibo_display_id != null) bindingByDisplay.set(r.xibo_display_id, r)
  }

  // Skjerm-status FØRST (varmer Xibo-token så påfølgende Xibo-kall gjenbruker det).
  const screensByStore = await fetchScreensByStore(list).catch(() => new Map<string, StoreScreen[]>())

  // /widget/preview-payload per live-innslag (bygges fra det lagrede innslaget).
  const bodiesRes = await supabase.from("content_items").select("id, type, title, valid_from, valid_to, body").eq("tenant_id", tenantId).eq("status", "live")
  const bodyRows = (bodiesRes.data ?? []) as { id: string; type: string; title: string; valid_from: string | null; valid_to: string | null; body: Record<string, unknown> | null }[]
  const previewById = new Map<string, string>()
  const thumbById = new Map<string, string | null>()
  for (const row of bodyRows) {
    previewById.set(row.id, buildPreviewData(row))
    thumbById.set(row.id, buildThumb(row.body))
  }

  // Per butikk: berik hver skjerm med DB-binding + hent NØYAKTIG innhold den spiller.
  const [storeData, insight, contentRes, upcomingRes] = await Promise.all([
    Promise.all(
      list.map(async (s) => {
        const sid = encodeURIComponent(s.id)
        const xScreens = screensByStore.get(s.id) ?? []
        const screens: FleetScreen[] = await Promise.all(
          xScreens.map(async (sc): Promise<FleetScreen> => {
            const b = bindingByDisplay.get(sc.displayId)
            const flate: "kunde" | "intern" = b?.flate ?? (sc.role === "bakrom" ? "intern" : "kunde")
            const avdeling = b?.avdeling ?? "felles"
            const orientation = b?.orientation ?? (flate === "intern" ? "landscape" : "portrait")
            const screenDbId = b?.id ?? null
            // Samme URL Pi-en spiller: kunde → tilbud (stående, per avdeling),
            // intern → bakrom (selv-roterende m/ KPI der tenant har det).
            const widgetSrc =
              flate === "intern"
                ? `/widget/bakrom?store=${sid}`
                : `/widget/tilbud?store=${sid}&avdeling=${encodeURIComponent(avdeling)}&o=portrait${screenDbId ? `&screen=${screenDbId}` : ""}`
            const items = await fetchLiveContent(s.id, ALL_TYPES, flate, avdeling, screenDbId).catch(() => [] as LiveItem[])
            return {
              displayId: sc.displayId,
              name: sc.name,
              online: sc.online,
              lastSeen: sc.lastSeen,
              sync: sc.sync,
              currentLayout: sc.currentLayout,
              clientVersion: sc.clientVersion,
              displayGroupId: sc.displayGroupId,
              flate,
              avdeling,
              avdelingLabel: avdLabel(flate, avdeling),
              orientation,
              widgetSrc,
              content: items.map((it) => toLite(it, previewById, thumbById)),
            }
          }),
        )
        // Butikk-nivå teller: unike aktive innslag levert til butikken (målretting).
        const pool = await fetchLiveContent(s.id, ALL_TYPES).catch(() => [] as LiveItem[])
        const liveCount = new Set(pool.map((p) => p.id)).size
        return { screens, liveCount }
      }),
    ),
    fetchScreenInsight().catch(() => ({ faults: [], topPlays: [], from: "", to: "" })),
    supabase.from("content_items").select("status, valid_to").eq("tenant_id", tenantId),
    supabase
      .from("content_items")
      .select("id, type, title, valid_from")
      .eq("tenant_id", tenantId)
      .eq("status", "live")
      .gt("valid_from", nowIso)
      .order("valid_from", { ascending: true })
      .limit(8),
  ])

  const stores: FleetStore[] = list.map((s, i) => ({
    id: s.id,
    name: s.name,
    city: s.city,
    lat: s.latitude,
    lon: s.longitude,
    screens: storeData[i].screens,
    liveCount: storeData[i].liveCount,
  }))

  // Ekte aggregat: total / online / trenger tilsyn (offline eller utdatert synk).
  let totalScreens = 0
  let onlineNow = 0
  let needsAttention = 0
  for (const store of stores) {
    for (const sc of store.screens) {
      totalScreens++
      if (sc.online) onlineNow++
      if (!sc.online || sc.sync === "stale") needsAttention++
    }
  }

  // Innholdshelse: live / utløper snart (7 d) / utkast / utløpt.
  const nowMs = Date.now()
  const weekMs = nowMs + 7 * 86400000
  const health: ContentHealth = { live: 0, expiringSoon: 0, drafts: 0, expired: 0 }
  for (const r of contentRes.data ?? []) {
    if (r.status === "draft") health.drafts++
    if (r.status === "live") {
      const t = r.valid_to ? new Date(r.valid_to).getTime() : null
      if (t !== null && t < nowMs) health.expired++
      else {
        health.live++
        if (t !== null && t <= weekMs) health.expiringSoon++
      }
    }
  }

  const stats: FleetStats = { totalScreens, onlineNow, needsAttention, liveItems: health.live }

  const faults: FaultLite[] = (insight.faults ?? []).map((f) => ({
    displayId: f.displayId,
    display: f.display,
    description: f.description,
    since: f.since,
  }))
  const topPlays: TopPlayLite[] = (insight.topPlays ?? []).slice(0, 5).map((p) => ({ layout: p.layout, plays: p.plays }))
  const upcoming: UpcomingLite[] = (upcomingRes.data ?? []).map((u) => ({
    id: u.id as string,
    type: u.type as string,
    title: u.title as string,
    validFrom: u.valid_from as string,
    storeName: null,
  }))

  // Tom flåte er onboarding, ikke drift: egen scene som svarer på «hva gjør jeg
  // nå?» og bruker det som ER ekte (innslagene som ligger klare) som motivasjon
  // — aldri fabrikkert innhold utkledd som live skjermer.
  if (totalScreens === 0) {
    const liveSamples: LiveLite[] = bodyRows
      .filter((r) => (!r.valid_from || new Date(r.valid_from).getTime() <= nowMs) && (!r.valid_to || new Date(r.valid_to).getTime() > nowMs))
      .slice(0, 6)
      .map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        avdeling: ((r.body?.avdeling as string | undefined) ?? "felles") || "felles",
        validTo: r.valid_to,
        imageUrl: thumbById.get(r.id) ?? null,
        previewData: previewById.get(r.id) ?? "",
      }))
    return <FleetOnboarding liveItems={health.live} liveSamples={liveSamples} upcoming={upcoming} userName={firstName} unitLabel={unitLabel} />
  }

  return (
    <SkjermflateScene
      stores={stores}
      stats={stats}
      faults={faults}
      topPlays={topPlays}
      health={health}
      upcoming={upcoming}
      lastSync={lastSync}
      userName={firstName}
      unitLabel={unitLabel}
      showKpi={showKpi}
    />
  )
}
