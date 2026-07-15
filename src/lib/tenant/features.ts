/**
 * Per-tenant funksjonskapabiliteter (feature flags).
 *
 * Dette er mekanismen for å bygge funksjonalitet/maler som KUN skal vises for
 * bestemte tenants — uten å hardkode tenant-navn i UI-koden. Hver funksjon/mal
 * sjekker `hasFeature(config.features, "<flagg>")`.
 *
 * Slå på for en tenant ved å sette `tenants.features` (jsonb), f.eks.
 *   {"offerCards": true, "gln": true}
 * Alt som ikke er satt = av. Nye tenants er «lean» som standard (opt-in per tenant).
 *
 * Legg til en ny funksjon:
 *   1. Legg nøkkel + doc her i TENANT_FEATURES.
 *   2. Gate UI/route med hasFeature(...).
 *   3. Slå på for aktuelle tenants i en migrasjon (tenants.features).
 */
export const TENANT_FEATURES = {
  /** Varekort-bygger (struktur), masseimport av tilbud og spar.no-oppslag — dagligvare. */
  offerCards: "Varekort & masseimport",
  /** GLN / EPD-lokasjonsnummer på enheter — dagligvare (EDI mot Tradesolution). */
  gln: "GLN / EPD-lokasjonsnummer",
  /** Liggende kampanjekort-bygger (premium plakat-mal, /widget/kampanje) — f.eks. bilforhandler. */
  campaignCards: "Kampanjekort (liggende)",
  /** KPI-dashboard + drift-synk («Oppdater KPI nå») — kun kjeder med Drift-integrasjon (Gange-Rolv). */
  kpi: "KPI-dashboard (drift-synk)",
  /** Sesongatmosfære på skjermflatene (jul-snø, 17. mai-konfetti, sommertone) — «Levende skjerm». */
  seasonThemes: "Sesongtemaer på skjerm",
  /** Tenanten har ingen kundeskjermer — skjul kundeflaten i admin og kiosk (kun interne skjermer). */
  hideKundeflate: "Skjul kundeskjerm-flaten",
  /** Tenanten har kun kundeskjermer — skjul intern-flaten i admin og kiosk. */
  hideInternflate: "Skjul intern-flaten",
} as const

export type TenantFeature = keyof typeof TENANT_FEATURES

export type TenantFeatures = Partial<Record<TenantFeature, boolean>>

/** Leser og validerer `tenants.features` (ukjent jsonb) til et typet, trygt sett. */
export function parseTenantFeatures(raw: unknown): TenantFeatures {
  if (!raw || typeof raw !== "object") return {}
  const source = raw as Record<string, unknown>
  const out: TenantFeatures = {}
  for (const key of Object.keys(TENANT_FEATURES) as TenantFeature[]) {
    if (source[key] === true) out[key] = true
  }
  return out
}

/** True hvis tenanten har den gitte funksjonen slått på. */
export function hasFeature(features: TenantFeatures | undefined, feature: TenantFeature): boolean {
  return features?.[feature] === true
}

/** Skjermflatene en tenant kan bruke (kundeskjermer / interne skjermer). */
export interface EnabledSurfaces {
  kunde: boolean
  intern: boolean
}

/**
 * Hvilke skjermflater tenanten faktisk har, styrt av hideKundeflate/hideInternflate.
 * Begge skjult er en feilkonfigurasjon — da faller vi tilbake til begge på, slik at
 * en tenant aldri kan miste hele admin-innholdsmenyen og alle kiosk-flater.
 */
export function enabledSurfaces(features: TenantFeatures | undefined): EnabledSurfaces {
  const kunde = !hasFeature(features, "hideKundeflate")
  const intern = !hasFeature(features, "hideInternflate")
  if (!kunde && !intern) return { kunde: true, intern: true }
  return { kunde, intern }
}

/**
 * Klemmer en lagret visningsflate («kunde» | «intern» | «begge») til flatene
 * tenanten har: med bare én flate på blir alt innhold liggende på den.
 */
export function clampAudience<T extends "kunde" | "intern" | "begge">(
  features: TenantFeatures | undefined,
  audience: T
): "kunde" | "intern" | "begge" {
  const surfaces = enabledSurfaces(features)
  if (surfaces.kunde && surfaces.intern) return audience
  return surfaces.kunde ? "kunde" : "intern"
}
