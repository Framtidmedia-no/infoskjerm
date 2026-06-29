"use server"

/**
 * Looks up a product from spar.no for the offer builder. Accepts a spar.no
 * product URL or a product id/GTIN. The product page embeds the full product
 * JSON (title, subtitle, price, deposit, unit price), and the image is served
 * deterministically from bilder.ngdata.no/{gtin}/kmh/large.jpg.
 *
 * Server-side fetch (no CORS), best-effort — returns what it can resolve.
 */

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

export async function lookupSparProduct(input: string): Promise<SparLookupResult> {
  const raw = input.trim()
  if (!raw) return { ok: false, error: "Lim inn en spar.no-lenke eller et GTIN-nummer." }

  const isUrl = /spar\.no\//i.test(raw)
  const url = isUrl ? (raw.startsWith("http") ? raw : `https://${raw}`) : null
  // The id/GTIN is the trailing number in the URL, or the raw number itself.
  const idMatch = (url ?? raw).match(/(\d{6,})(?:[/?#]|$)/)
  const gtin = idMatch?.[1] ?? (/^\d{6,}$/.test(raw) ? raw : null)
  if (!gtin) return { ok: false, error: "Fant ikke GTIN i lenken. Lim inn hele spar.no-lenken eller bare tallet." }

  // Without a URL we can still give the image; name/price needs the product page.
  if (!url) {
    return { ok: true, product: { gtin, varenavn: null, vareinfo: null, pris: null, enhetspris: null, pant: false, imageUrl: imageFor(gtin) } }
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
    // Page fetch failed — still return the image so the user can fill the rest.
    return { ok: true, product: { gtin, varenavn: null, vareinfo: null, pris: null, enhetspris: null, pant: false, imageUrl: imageFor(gtin) }, error: err instanceof Error ? err.message : undefined }
  }
}
