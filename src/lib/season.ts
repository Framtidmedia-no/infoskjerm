/**
 * Dato-styrte sesongtemaer for skjermflatene («Levende skjerm»). Ren funksjon
 * uten side-effekter — testbar og SSR-trygg. Gates per tenant via feature-
 * flagget `seasonThemes` (src/lib/tenant/features.ts) i widget-pagene.
 * Datovinduene er systemkonstanter (known non-CMS, se spec).
 */

export type SeasonKey = "jul" | "syttendemai" | "sommer"

export interface Season {
  key: SeasonKey
  /** Valgfri tonefarge som blandes inn i AmbientBackdrop-gløden. */
  tint: string | null
}

/** [måned 1–12, dag]. `from > to` betyr at vinduet krysser årsskiftet. */
interface SeasonWindow {
  key: SeasonKey
  tint: string | null
  from: [number, number]
  to: [number, number]
}

const WINDOWS: SeasonWindow[] = [
  { key: "syttendemai", tint: null, from: [5, 15], to: [5, 17] },
  { key: "jul", tint: "#7dd3fc", from: [12, 1], to: [1, 1] },
  { key: "sommer", tint: "#fbbf24", from: [6, 1], to: [8, 31] },
]

export function activeSeason(now: Date = new Date()): Season | null {
  const md = (now.getMonth() + 1) * 100 + now.getDate()
  for (const w of WINDOWS) {
    const from = w.from[0] * 100 + w.from[1]
    const to = w.to[0] * 100 + w.to[1]
    const hit = from <= to ? md >= from && md <= to : md >= from || md <= to
    if (hit) return { key: w.key, tint: w.tint }
  }
  return null
}

/** Preview-override (`?season=jul`) — kun kjente nøkler slipper gjennom. */
export function parseSeasonKey(raw: string | null | undefined): Season | null {
  const w = WINDOWS.find((x) => x.key === raw)
  return w ? { key: w.key, tint: w.tint } : null
}
