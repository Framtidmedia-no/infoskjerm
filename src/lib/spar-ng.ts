/**
 * NorgesGruppens plattform-API (episearch) — brukes som fallback når
 * tilbudsbyggeren bare har en GTIN/PLU og ingen spar.no-lenke å skrape.
 * Kjede-ID 1210 = spar.no (funnet i spar.no sin egen frontend-config).
 *
 * Selve fetch-en skjer i server action (spar-actions.ts); her ligger den
 * rene mappingen fra API-treff til tilbudskort-felter, så den kan testes.
 */

export const NG_SEARCH_URL = "https://platform-rest-prod.ngdata.no/api/episearch/1210/products"

/** Feltene vi leser fra episearch-treffets contentData (alle best-effort). */
export interface NgContentData {
  ean?: string
  title?: string
  subtitle?: string
  description?: string
  pricePerUnit?: number
  comparePricePerUnit?: number
  compareUnit?: string
  recycleValue?: number
  imagePath?: string
}

export interface NgProduct {
  gtin: string
  varenavn: string | null
  vareinfo: string | null
  pris: string | null
  enhetspris: string | null
  pant: boolean
  imageUrl: string
}

export function nokFormat(n: number): string {
  return n.toLocaleString("nb-NO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Mapper et episearch-treff til tilbudskort-felter. Returnerer null hvis
 * treffet ikke er varen vi spurte om (fuzzy-søk kan gi naboprodukter).
 */
export function ngHitToProduct(gtin: string, hit: NgContentData | undefined): NgProduct | null {
  if (!hit || hit.ean !== gtin) return null
  return {
    gtin,
    varenavn: hit.title?.trim() || null,
    vareinfo: hit.subtitle?.trim() || hit.description?.trim() || null,
    pris: typeof hit.pricePerUnit === "number" ? nokFormat(hit.pricePerUnit) : null,
    enhetspris:
      typeof hit.comparePricePerUnit === "number" && hit.compareUnit
        ? `kr ${nokFormat(hit.comparePricePerUnit)}/${hit.compareUnit}`
        : null,
    pant: (hit.recycleValue ?? 0) > 0,
    // Bildet ligger ikke alltid under samme GTIN som varen (agurk = leverandør-GTIN),
    // så bruk API-ets imagePath når det finnes.
    imageUrl: hit.imagePath
      ? `https://bilder.ngdata.no/${hit.imagePath}/large.jpg`
      : `https://bilder.ngdata.no/${gtin}/kmh/large.jpg`,
  }
}
