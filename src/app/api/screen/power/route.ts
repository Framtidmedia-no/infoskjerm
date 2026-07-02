import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"
import { decideForScreenToken } from "@/lib/power/decide"
import type { PowerDecision } from "@/lib/power/schedule"

/**
 * Strømstyring for skjermer. Skjerm-tokenet er kapabiliteten (samme modell som
 * /skjerm/<token>), service-role slår opp på tvers av RLS.
 *
 *  GET  ?token=…            → ønsket tilstand nå (kiosk-hvilevisning + admin)
 *  POST {token, tvState}    → Pi-agenten rapporterer faktisk TV-status og får
 *                             ønsket tilstand tilbake i samme rundtur
 */

export const dynamic = "force-dynamic"

function decisionBody(decision: PowerDecision) {
  return {
    ok: true as const,
    desired: decision.desired,
    reason: decision.reason,
    nextTransition: decision.nextTransition?.toISOString() ?? null,
    serverTime: new Date().toISOString(),
    pollSeconds: 60,
  }
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")
  if (!token) return NextResponse.json({ ok: false, error: "token mangler" }, { status: 400 })

  try {
    const result = await decideForScreenToken(createAdminClient(), token)
    if (!result) return NextResponse.json({ ok: false, error: "ukjent skjerm" }, { status: 404 })
    return NextResponse.json(decisionBody(result.decision))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  let body: { token?: string; tvState?: string; info?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "ugyldig JSON" }, { status: 400 })
  }
  const token = body.token?.trim()
  if (!token) return NextResponse.json({ ok: false, error: "token mangler" }, { status: 400 })

  const tvState = body.tvState === "on" || body.tvState === "off" ? body.tvState : "unknown"

  try {
    const supabase = createAdminClient()
    const result = await decideForScreenToken(supabase, token)
    if (!result) return NextResponse.json({ ok: false, error: "ukjent skjerm" }, { status: 404 })

    // Rapportert TV-status → synlig i admin (badge + «sist sett»).
    const update: Record<string, string> = {
      power_state: tvState,
      power_state_at: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }
    if (body.info && typeof body.info === "string") update.app_info = body.info.slice(0, 200)
    await (supabase.from("screens") as unknown as {
      update: (v: Record<string, string>) => { eq: (c: string, v2: string) => Promise<{ error: unknown }> }
    }).update(update).eq("id", result.screen.id)

    return NextResponse.json(decisionBody(result.decision))
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ukjent feil"
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
