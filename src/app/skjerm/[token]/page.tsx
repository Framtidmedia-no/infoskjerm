import { notFound } from "next/navigation"
import type { Viewport } from "next"
import { createAdminClient } from "@/lib/supabase/server"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { hasFeature } from "@/lib/tenant/features"
import { decideForScreenToken } from "@/lib/power/decide"
import { ScaledScreen } from "./scaled-screen"
import { SleepGate } from "./sleep-gate"

/**
 * ENHETS-STYRT skjerm-URL. Hver fysiske Raspberry Pi laster ÉN stabil URL
 * (/skjerm/<token>) via sin Xibo-layout. Denne siden slår opp skjermens
 * tildeling (flate + avdeling + orientering) og rendrer riktig widget.
 *
 * Konsekvens: alt styres fra vår admin. Endrer du flate/avdeling/orientering på
 * skjermen → Pi-en oppdaterer seg selv ved neste last. Vi rører aldri Pi-en
 * igjen, og en ny avdeling er bare en datarad — ingen omprogrammering.
 */

export const dynamic = "force-dynamic"

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
}

type ScreenRow = {
  id: string
  store_id: string | null
  flate: string | null
  avdeling: string | null
  orientation: string | null
}

/**
 * Bygger widget-URL fra skjermens tildeling. `grocery` = tenanten har dagligvare-
 * KPI (offerCards) → intern viser bakrom (KPI + intern nyheter), ellers ren
 * intern nyhetsflate (bil o.l.).
 */
function widgetFor(row: ScreenRow, grocery: boolean): string {
  const store = row.store_id ?? ""
  const avdeling = row.avdeling || "felles"
  const landscape = row.orientation === "landscape" || row.orientation === "liggende"
  // screen=<id> gir widgeten skjermkontekst, så innhold målrettet mot akkurat
  // denne skjermen (content_targets.screen_id) slipper gjennom leveringsfilteret.
  const q = `store=${store}&avdeling=${encodeURIComponent(avdeling)}&screen=${row.id}`
  if (row.flate === "intern") {
    return grocery ? `/widget/bakrom?${q}` : `/widget/nyheter?${q}&flate=intern`
  }
  // Kunde: liggende → premium kampanjemal, stående → tilbud/plakat.
  return landscape ? `/widget/kampanje?${q}` : `/widget/tilbud?${q}`
}

export default async function SkjermPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  if (!token) notFound()

  const supabase = createAdminClient()
  const { data } = await supabase
    .from("screens")
    .select("id, store_id, tenant_id, flate, avdeling, orientation")
    .eq("token", token)
    .maybeSingle()
  const row = data as (ScreenRow & { tenant_id: string | null }) | null
  if (!row) notFound()

  const config = await getTenantConfig(supabase, row.tenant_id)
  const grocery = hasFeature(config.features, "offerCards")

  // Åpningstids-styrt hvile: utenfor åpningstid sover kiosk-skjermer med en
  // svart visning (SleepGate poller og våkner selv). Beregnes server-side her
  // så første render aldri blinker innhold på en sovende skjerm.
  const power = await decideForScreenToken(supabase, token)
  const initialDesired = power?.decision.desired ?? "on"
  const initialNext = power?.decision.nextTransition?.toISOString() ?? null

  // Widgeten rendres i sin faste design-oppløsning og skaleres uniformt til vinduet
  // (se ScaledScreen). Slik ser laptop-testen identisk ut med Pi-en, og faste
  // pikselstørrelser i malene sprenger aldri i et lite vindu.
  const landscape = row.orientation === "landscape" || row.orientation === "liggende"

  return (
    <SleepGate token={token} initialDesired={initialDesired} initialNext={initialNext}>
      <ScaledScreen src={widgetFor(row, grocery)} landscape={landscape} />
    </SleepGate>
  )
}
