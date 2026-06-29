import { NextResponse } from "next/server"
import { reconcileOfferSchedules } from "@/lib/xibo/offers"

/**
 * Reconciles the per-store full-screen "Tilbud" Xibo layouts: each store's offer
 * layout is scheduled onto its screen only while the store has active offers.
 * Offers are date-windowed, so this runs a few times a day to catch validity
 * boundaries (publish/delete also trigger an immediate reconcile in-app).
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await reconcileOfferSchedules()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
