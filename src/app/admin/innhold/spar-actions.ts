"use server"

/**
 * Looks up a product from spar.no for the offer builder. Accepts a spar.no
 * product URL, a product id/GTIN, or a 4–5-digit PLU code for løsvekt
 * (expanded to the internal «20»-EAN-13 in @/lib/gtin). The product page
 * embeds the full product JSON (title, subtitle, price, deposit, unit price),
 * and the image is served deterministically from
 * bilder.ngdata.no/{gtin}/kmh/large.jpg.
 *
 * Server-side fetch (no CORS), best-effort — returns what it can resolve.
 */

import { normalizeGtinInput } from "@/lib/gtin"
import { NG_SEARCH_URL, ngHitToProduct, type NgContentData } from "@/lib/spar-ng"

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"

export interface SparProduct {
  gtin: string
  varenavn: string | null
  vareinfo: string | null
  pris: string | null
  enhetspris: string | null
  pant: boolean
  imageUrl: string
}

export interface SparLookupResult {
  ok: boolean
  product?: SparProduct
  error?: string
}

function imageFor(gtin: string): string {
  return `https://bilder.ngdata.no/${gtin}/kmh/large.jpg`
}

function nok(n: number): string {
  return n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Returnerer en trygg https-URL kun hvis hostnavnet er spar.no (eller subdomene), ellers null. */
function sparUrl(raw: string): string | null {
  if (!/spar\.no/i.test(raw)) return null
  const candidate = raw.startsWith("http") ? raw : `https://${raw}`
  let u: URL
  try {
    u = new URL(candidate)
  } catch {
    return null
  }
  if (u.protocol !== "https:") return null
  const host = u.hostname.toLowerCase()
  if (host !== "spar.no" && !host.endsWith(".spar.no")) return null
  return u.toString()
}

export async function lookupSparProduct(input: string): Promise<SparLookupResult> {
  const raw = input.trim()
  if (!raw) return { ok: false, error: "Lim inn en spar.no-lenke eller et GTIN-nummer." }

  // Validér mot faktisk hostnavn (ikke bare at strengen inneholder «spar.no») —
  // ellers kunne f.eks. https://evil.com/spar.no/ passere og bli hentet (SSRF).
  const url = sparUrl(raw)
  // The id/GTIN is the trailing number in the URL, or the raw number itself.
  // Alt normaliseres: 4–5 siffer = PLU som utvides, 23-koder nullstilles til
  // katalogform (vekt/pris fra vekta ligger i de siste sifrene).
  const idMatch = (url ?? raw).match(/(\d{6,})(?:[/?#]|$)/)
  const gtin = normalizeGtinInput(idMatch?.[1] ?? raw)
  if (!gtin) return { ok: false, error: "Fant ikke GTIN i lenken. Lim inn hele spar.no-lenken, GTIN eller PLU-nummeret (4–5 siffer)." }

  // Without a URL: name/price/image comes from NG's platform API (same source
  // spar.no's own search uses) — falls back to just the deterministic image.
  if (!url) {
    const ng = await lookupNgProduct(gtin)
    return { ok: true, product: ng ?? { gtin, varenavn: null, vareinfo: null, pris: null, enhetspris: null, pant: false, imageUrl: imageFor(gtin) } }
  }

  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" })
    if (!res.ok) throw new Error(`spar.no ${res.status}`)
    const t = (await res.text()).replace(/\\"/g, '"')

    // Anchor to the main product object (matches the id from the URL).
    let idx = t.indexOf(`"product":{"ean":"${gtin}"`)
    if (idx < 0) idx = t.indexOf(`"ean":"${gtin}"`)
    const win = idx >= 0 ? t.slice(idx, idx + 2000) : t

    const pick = (re: RegExp): string | null => win.match(re)?.[1]?.trim() || null
    const title = pick(/"title":"([^"]+)"/)
    const subtitle = pick(/"subtitle":"([^"]*)"/)
    const imageGtin = pick(/"imageGtin":"(\d+)"/) ?? gtin
    const priceStr = pick(/"price":([\d.]+)/)
    const recycle = pick(/"recycleValue":([\d.]+)/)
    const comparable = pick(/"comparablePrice":([\d.]+)/)
    const compareUnit = pick(/"compareUnit":"([^"]*)"/)

    return {
      ok: true,
      product: {
        gtin,
        varenavn: title,
        vareinfo: subtitle,
        pris: priceStr ? nok(Number(priceStr)) : null,
        enhetspris: comparable && compareUnit ? `kr ${nok(Number(comparable))}/${compareUnit}` : null,
        pant: recycle ? Number(recycle) > 0 : false,
        imageUrl: imageFor(imageGtin),
      },
    }
  } catch (err) {
    // Page fetch failed — try the platform API before falling back to image-only.
    const ng = await lookupNgProduct(gtin)
    return {
      ok: true,
      product: ng ?? { gtin, varenavn: null, vareinfo: null, pris: null, enhetspris: null, pant: false, imageUrl: imageFor(gtin) },
      error: ng ? undefined : err instanceof Error ? err.message : undefined,
    }
  }
}

/** Slår opp navn/pris/bilde i NG-plattform-API-et for en ren GTIN (best effort). */
async function lookupNgProduct(gtin: string): Promise<SparProduct | null> {
  try {
    const res = await fetch(`${NG_SEARCH_URL}?search=${gtin}&page_size=1`, {
      headers: { "User-Agent": UA },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = (await res.json()) as { hits?: { contentData?: NgContentData }[] }
    return ngHitToProduct(gtin, data.hits?.[0]?.contentData)
  } catch {
    return null
  }
}
