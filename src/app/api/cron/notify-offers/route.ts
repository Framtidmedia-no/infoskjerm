import { NextResponse } from "next/server"
import { pushAdminClient, sendPushToRoles } from "@/lib/push/send"

/**
 * Varsler administratorer (super_admin + chain_manager) når publiserte oppslag
 * utløper innen 24 timer, så de rekker å forlenge. Kjøres en gang om dagen.
 */

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: Request) {
  const auth = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const db = pushAdminClient()
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data, error } = await db
    .from("content_items")
    .select("id, title, valid_to")
    .eq("status", "live")
    .not("valid_to", "is", null)
    .gte("valid_to", now.toISOString())
    .lte("valid_to", in24h.toISOString())

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const items = (data ?? []) as Array<{ title: string | null }>
  if (items.length === 0) return NextResponse.json({ ok: true, expiring: 0, sent: 0 })

  const title = items.length === 1 ? "1 oppslag utløper snart" : `${items.length} oppslag utløper snart`
  const body =
    items.length === 1
      ? `«${items[0].title ?? "Uten tittel"}» utløper innen 24 timer.`
      : `${items.length} oppslag utløper innen 24 timer — sjekk og forleng ved behov.`

  const res = await sendPushToRoles(["super_admin", "chain_manager"], {
    title,
    body,
    url: "/admin/kundeinnhold",
    tag: "expiring-offers",
  })

  return NextResponse.json({ ok: true, expiring: items.length, ...res })
}
