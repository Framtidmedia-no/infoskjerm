import type { CardSpec, DemoVariant, FleetStore } from "./types"

/**
 * Kort-logikken for coverflowen — ren og testbar (ingen React).
 *
 * To harde regler:
 * 1. Ekte skjermer paddes ALDRI med demo-kort — det som vises er det som finnes.
 * 2. Demo-kort vises kun ved eksplisitt «Se eksempel», og bruker ALDRI et ekte
 *    butikknavn: fabrikkert innhold (priser, åpningstider) hører til
 *    «Eksempelbutikk», så det aldri kan leses som live drift.
 */

export type FlateTab = "alle" | "kunde" | "internt"

export const DEMO_STORE_NAME = "Eksempelbutikk"

const DEMO_VARIANTS: DemoVariant[] = ["offer", "menu", "hours"]

/** Butikkens ekte skjermer på valgt flate — hvert kort spiller skjermens EKTE widget-URL. */
export function buildRealCards(focus: FleetStore, tab: FlateTab): CardSpec[] {
  const filtered = focus.screens.filter((s) =>
    tab === "kunde" ? s.flate === "kunde" : tab === "internt" ? s.flate === "intern" : true,
  )
  return filtered.map((s) => ({
    key: `s-${s.displayId}`,
    live: true,
    src: s.widgetSrc,
    demo: "offer",
    store: focus.name,
    pill: { label: s.name, state: s.online },
    contentLabel: s.flate === "intern" ? "Internskjerm · Bakrom" : "Kundeskjerm",
    contentKind: s.flate === "intern" ? "intern" : "kunde",
    avdeling: s.avdelingLabel,
    orientation: s.orientation,
    screen: s,
  }))
}

/** Kuraterte eksempel-kort — én per variant, tydelig merket og uten ekte butikknavn. */
export function buildDemoCards(heleLabel: string): CardSpec[] {
  return DEMO_VARIANTS.map((variant, i) => ({
    key: `demo-${i}`,
    live: false,
    demo: variant,
    store: DEMO_STORE_NAME,
    pill: { label: DEMO_STORE_NAME, state: null, sub: "Eksempel" },
    contentLabel: "Eksempelvisning",
    contentKind: "demo",
    avdeling: heleLabel,
    orientation: "portrait",
  }))
}
