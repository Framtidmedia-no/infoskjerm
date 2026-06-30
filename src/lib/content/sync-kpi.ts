import { createAdminClient } from "@/lib/supabase/server"

/**
 * Pulls operational KPIs from the Gange-Rolv Drift database into this project's
 * `store_kpi_week` + `store_svinn_kommentert` tables. Used by both the daily cron
 * (src/app/api/cron/sync-kpi) and the manual "Oppdater KPI nå" admin action. The
 * Drift service key is server-side only; upserts are idempotent, so running twice
 * (or right after a new week is loaded into Drift) is harmless.
 */

interface BonusRow {
  butikk_id: number
  uke: number
  ar: number
  netto_omsetning: number | null
  budsjett_omsetning: number | null
  netto_omsetning_fjoraaret: number | null
  brutto_kr: number | null
  budsjett_brutto_kr: number | null
  lonn_kr: number | null
  budsjett_lonn: number | null
  svinn_total: number | null
  svinn_total_fjoraaret: number | null
  budsjett_svinn_gras: number | null
  importert_tidspunkt: string | null
}
interface SvinnStatRow {
  store_name: string
  total_responses: number | null
  kommentert: number | null
  kommentert_percentage: number | null
  svinn_prosent: number | null
}

export interface SyncKpiResult {
  year: number
  kpiWeeks: number
  svinnStores: number
  syncedAt: string
}

async function driftGet<T>(path: string): Promise<T> {
  const base = process.env.DRIFT_SUPABASE_URL
  const key = process.env.DRIFT_SUPABASE_SERVICE_KEY
  if (!base || !key) throw new Error("DRIFT_SUPABASE_URL / DRIFT_SUPABASE_SERVICE_KEY mangler")
  const r = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  })
  if (!r.ok) throw new Error(`Drift ${path} → ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json() as Promise<T>
}

export async function syncKpiFromDrift(): Promise<SyncKpiResult> {
  const year = new Date().getFullYear()
  const supabase = createAdminClient()

  // infoskjerm stores: name → id (exact name match with Drift).
  const { data: stores } = await supabase.from("stores").select("id, name")
  const idByName = new Map((stores ?? []).map((s) => [s.name.trim().toUpperCase(), s.id]))

  // Drift: store id → name, weekly KPIs (this year), 10-week svinn comment stats.
  const [butikker, bonus, svinnStats] = await Promise.all([
    driftGet<{ butikkid: number; butikk: string }[]>("butikker?select=butikkid,butikk"),
    driftGet<BonusRow[]>(`bonus_nokkeltall?ar=eq.${year}&select=*`),
    driftGet<SvinnStatRow[]>("svinn_stats_10_weeks?select=store_name,total_responses,kommentert,kommentert_percentage,svinn_prosent"),
  ])
  const nameByButikkId = new Map(butikker.map((b) => [b.butikkid, b.butikk.trim().toUpperCase()]))

  // 1. Weekly KPIs → store_kpi_week.
  const kpiRows = bonus
    .map((r) => {
      const storeId = idByName.get(nameByButikkId.get(r.butikk_id) ?? "")
      if (!storeId) return null
      return {
        store_id: storeId,
        uke: r.uke,
        ar: r.ar,
        netto_omsetning: r.netto_omsetning,
        budsjett_omsetning: r.budsjett_omsetning,
        netto_omsetning_fjoraaret: r.netto_omsetning_fjoraaret,
        brutto_kr: r.brutto_kr,
        budsjett_brutto_kr: r.budsjett_brutto_kr,
        lonn_kr: r.lonn_kr,
        budsjett_lonn: r.budsjett_lonn,
        svinn_total: r.svinn_total,
        svinn_total_fjoraaret: r.svinn_total_fjoraaret,
        budsjett_svinn_gras: r.budsjett_svinn_gras,
        importert_tidspunkt: r.importert_tidspunkt,
        synced_at: new Date().toISOString(),
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (kpiRows.length > 0) {
    const { error } = await supabase.from("store_kpi_week").upsert(kpiRows, { onConflict: "store_id,ar,uke" })
    if (error) throw new Error(`store_kpi_week upsert: ${error.message}`)
  }

  // 2. Svinn comment stats → store_svinn_kommentert.
  const svinnRows = svinnStats
    .map((r) => {
      const storeId = idByName.get(r.store_name.trim().toUpperCase())
      if (!storeId) return null
      const total = r.total_responses ?? 0
      const kommentert = r.kommentert ?? 0
      return {
        store_id: storeId,
        total_responses: total,
        kommentert,
        ikke_kommentert: Math.max(0, total - kommentert),
        kommentert_prosent: r.kommentert_percentage,
        svinn_prosent: r.svinn_prosent,
        synced_at: new Date().toISOString(),
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  if (svinnRows.length > 0) {
    const { error } = await supabase.from("store_svinn_kommentert").upsert(svinnRows, { onConflict: "store_id" })
    if (error) throw new Error(`store_svinn_kommentert upsert: ${error.message}`)
  }

  return {
    year,
    kpiWeeks: kpiRows.length,
    svinnStores: svinnRows.length,
    syncedAt: new Date().toISOString(),
  }
}
