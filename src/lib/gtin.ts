/**
 * PLU/vektvare → GTIN-normalisering for tilbudsbyggeren.
 *
 * Kassa-koder for løsvekt er interne EAN-13-koder med «20»-prefiks
 * (GS1 restricted circulation). Butikkene kjenner varene på PLU-nummeret
 * (4011 = banan, 4595 = agurk), så tilbudsbyggeren godtar bare PLU-en og
 * utvider selv til full EAN-13 som bilder.ngdata.no/spar.no forstår:
 *
 *   4-sifret PLU:  2000 + PLU → 20004011 → 200040110000 + kontrollsiffer → 2000401100000
 *   5-sifret PLU:  200 + PLU  → 20044011 → 200440110000 + kontrollsiffer → 2004401100008
 *
 * Vektvare-koder med «23»-prefiks (ferskvaredisk/vekt) har vekt eller pris
 * innbakt i de siste sifrene. Katalogformen er alltid de 8 første sifrene
 * + nuller + kontrollsiffer: 23715643xxxxx → 2371564300003 (Sommerkoteletter).
 */

/** Standard EAN-13-kontrollsiffer (vekter 1/3 vekselvis fra venstre) for en 12-sifret base. */
export function ean13CheckDigit(digits12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(digits12[i]) * (i % 2 === 0 ? 1 : 3)
  return String((10 - (sum % 10)) % 10)
}

/** Nullpadder en varenummer-base (≤12 siffer) til 12 og legger på kontrollsiffer. */
function toCatalogEan13(base: string): string {
  const padded = base.padEnd(12, "0")
  return padded + ean13CheckDigit(padded)
}

/** Utvider en 4- eller 5-sifret PLU-kode til intern EAN-13 «20»-kode. */
export function expandPluToGtin(plu: string): string {
  return toCatalogEan13(plu.length === 4 ? `2000${plu}` : `200${plu}`)
}

/**
 * «23»-koder: kun de 8 første sifrene identifiserer varen — resten er
 * vekt/pris fra vekta. Returnerer katalogformen (8 siffer + nuller + kontrollsiffer).
 */
export function catalogGtinFrom23(code: string): string {
  return toCatalogEan13(code.slice(0, 8))
}

/**
 * Normaliserer et rent tall-input til en GTIN for oppslag:
 * 4–5 siffer tolkes som PLU og utvides, 8+ siffer med «23»-prefiks
 * nullstilles til katalogform, øvrige 6+ siffer brukes som de er.
 * Returnerer null hvis input ikke er et brukbart varenummer.
 */
export function normalizeGtinInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (/^\d{4,5}$/.test(trimmed)) return expandPluToGtin(trimmed)
  if (/^23\d{6,}$/.test(trimmed)) return catalogGtinFrom23(trimmed)
  if (/^\d{6,}$/.test(trimmed)) return trimmed
  return null
}
