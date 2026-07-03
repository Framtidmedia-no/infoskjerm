import { NextResponse } from "next/server"
import { syncKpiFromDrift } from "@/lib/content/sync-kpi"

/**
 * Daily sync of operational KPIs from the Gange-Rolv Drift database into this
 * project's `store_kpi_week` + `store_svinn_kommentert` tables. The staff KPI
 * screens read only this project. Scheduled ~14:00 Norwegian time (12:00 & 13:00
 * UTC, see vercel.json); idempotent upserts, so running twice is harmless. The
 * actual work lives in @/lib/content/sync-kpi so the admin "Oppdater KPI nå"
 * button can reuse it.
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncKpiFromDrift()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : "ukjent feil"
    console.error("sync-kpi feilet:", message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
