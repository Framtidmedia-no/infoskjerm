import type { ScreenSync } from "@/lib/xibo/screens"

/**
 * En skjerm i flåten, beriket med DB-bindingen (flate/avdeling/orientering) og
 * NØYAKTIG det den spiller: samme widget-URL og samme innhold Pi-en viser.
 */
export interface FleetScreen {
  displayId: number
  name: string
  online: boolean
  lastSeen: string | null
  sync: ScreenSync
  currentLayout: string | null
  clientVersion: string | null
  displayGroupId: number
  /** Publikum: kundeskjerm eller intern (bakrom). Fra DB-binding, ellers rolle. */
  flate: "kunde" | "intern"
  /** Avdeling-nøkkel (f.eks. «ferskvare» / «felles»). */
  avdeling: string
  /** Avdeling-etikett for visning (f.eks. «Hele butikken» / «Ferskvare»). */
  avdelingLabel: string
  orientation: "portrait" | "landscape"
  /** Den EKTE widget-URLen skjermen spiller (tilbud stående / bakrom selv-rot.). */
  widgetSrc: string
  /** Det skjermen FAKTISK viser nå (butikk + flate + avdeling + skjerm-målretting). */
  content: LiveLite[]
}

/**
 * Delte, serialiserbare typer for Skjermflåte-siden. Holdt i en ren type-fil så
 * server-siden (page.tsx) og klient-komponentene deler kontrakt uten import-sykler.
 */

/** null = ingen fysisk enhet bundet (demo-slot); true/false = ekte tilkobling. */
export type PillState = boolean | null

export interface DeckPillData {
  label: string
  state: PillState
  sub?: string
}

export type DemoVariant = "offer" | "menu" | "hours"

/** Hva slags flate kortet representerer — styrer chip-etikett + ikon. */
export type ContentKind = "kunde" | "intern" | "kpi" | "demo"

export interface CardSpec {
  key: string
  live: boolean
  /** Den EKTE widget-URLen skjermen spiller (tilbud stående / bakrom m/ KPI). */
  src?: string
  demo: DemoVariant
  store: string
  pill: DeckPillData
  /** Skjermtype: «Kundeskjerm», «Internskjerm · Bakrom», «Demo». */
  contentLabel: string
  contentKind: ContentKind
  /** Avdeling — ALLTID satt, standard «Hele butikken/forhandleren». */
  avdeling: string
  orientation: "portrait" | "landscape"
  /** Den ekte skjermen kortet representerer (mangler på demo-kort). */
  screen?: FleetScreen
}

/** Kompakt live-innslag for «Nå på skjermen»-lista. */
export interface LiveLite {
  id: string
  type: string
  title: string
  avdeling: string
  validTo: string | null
  imageUrl: string | null
  /** base64url-payload for /widget/preview — rendrer innslaget 1:1 som editoren. */
  previewData: string
}

/** Kompakt kommende (planlagt) innslag — valid_from i framtida. */
export interface UpcomingLite {
  id: string
  type: string
  title: string
  validFrom: string
  storeName: string | null
}

export interface FaultLite {
  displayId: number | null
  display: string | null
  description: string
  since: string | null
}

export interface TopPlayLite {
  layout: string
  plays: number
}

export interface ContentHealth {
  live: number
  expiringSoon: number
  drafts: number
  expired: number
}

export interface FleetStore {
  id: string
  name: string
  city: string | null
  lat: number | null
  lon: number | null
  screens: FleetScreen[]
  /** Antall unike aktive innslag levert til butikken (butikk-målretting). */
  liveCount: number
}

export interface FleetStats {
  totalScreens: number
  onlineNow: number
  needsAttention: number
  liveItems: number
}
