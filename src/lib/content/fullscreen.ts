import { isDeckUrl } from "./deck"

/**
 * Ren logikk for fullskjerm-media: velger orienterings-variant og beregner
 * total visningstid. Delt mellom rotatorene (nyheter/tilbud/kampanje) så
 * variant-fallbacken og varigheten er identisk overalt.
 */

/** Sekunder per dokumentside når ingen egen visningstid er satt. */
export const FULLSCREEN_PAGE_SECONDS = 8

export interface FullscreenSource {
  imageUrl: string | null
  pages: string[]
  portraitUrl: string | null
  portraitPages: string[]
}

export interface FullscreenVariant {
  url: string | null
  pages: string[]
}

/** Velger variant for skjermens orientering; faller tilbake til den andre når én mangler. */
export function pickFullscreenVariant(item: FullscreenSource, portrait: boolean): FullscreenVariant {
  const landscape = { url: item.imageUrl, pages: item.pages }
  const upright = { url: item.portraitUrl, pages: item.portraitPages }
  if (portrait) return upright.url ? upright : landscape
  return landscape.url ? landscape : upright
}

/**
 * Total visningstid (sek) for et fullskjerm-element. For dokumenter er
 * durationSeconds PER SIDE; for bilde/video gjelder den hele elementet.
 * Returnerer null når elementet ikke er fullskjerm (rotatorens vanlige logikk).
 */
export function fullscreenItemSeconds(
  item: FullscreenSource & { imageMode: string; durationSeconds: number | null },
  portrait: boolean,
  fallbackSeconds: number
): number | null {
  if (item.imageMode !== "fullskjerm") return null
  const v = pickFullscreenVariant(item, portrait)
  if (v.url && isDeckUrl(v.url) && v.pages.length > 0) {
    return (item.durationSeconds ?? FULLSCREEN_PAGE_SECONDS) * v.pages.length
  }
  return item.durationSeconds ?? fallbackSeconds
}
