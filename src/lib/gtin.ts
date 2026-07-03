/**
 * PLU → GTIN-utviding for løsvekt frukt/grønt.
 *
 * Kassa-koder for løsvekt er interne EAN-13-koder med «20»-prefiks
 * (GS1 restricted circulation). Butikkene kjenner varene på PLU-nummeret
 * (4011 = banan, 4595 = agurk), så tilbudsbyggeren godtar bare PLU-en og
 * utvider selv til full EAN-13 som bilder.ngdata.no/spar.no forstår:
 *
 *   4-sifret PLU:  2000 + PLU → 20004011 → 200040110000 + kontrollsiffer → 2000401100000
 *   5-sifret PLU:  200 + PLU  → 20044011 → 200440110000 + kontrollsiffer → 2004401100008
 */

/** Standard EAN-13-kontrollsiffer (vekter 1/3 vekselvis fra venstre) for en 12-sifret base. */
export function ean13CheckDigit(digits12: string): string {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(digits12[i]) * (i % 2 === 0 ? 1 : 3)
  return String((10 - (sum % 10)) % 10)
}

/** Utvider en 4- eller 5-sifret PLU-kode til intern EAN-13 «20»-kode. */
export function expandPluToGtin(plu: string): string {
  const base = (plu.length === 4 ? `2000${plu}` : `200${plu}`).padEnd(12, "0")
  return base + ean13CheckDigit(base)
}

/**
 * Normaliserer et rent tall-input til en GTIN for oppslag:
 * 4–5 siffer tolkes som PLU og utvides, 6+ siffer brukes som de er.
 * Returnerer null hvis input ikke er et brukbart varenummer.
 */
export function normalizeGtinInput(raw: string): string | null {
  const trimmed = raw.trim()
  if (/^\d{4,5}$/.test(trimmed)) return expandPluToGtin(trimmed)
  if (/^\d{6,}$/.test(trimmed)) return trimmed
  return null
}
