"use server"

import { lookupSparProduct } from "../innhold/spar-actions"
import { saveContent, type ContentInput, type TargetMode } from "../innhold/actions"
import type { OfferFields } from "@/lib/content/live"

/**
 * Bulk offer import. Reuses the existing spar.no lookup and saveContent so the
 * single-item flow is untouched — this just orchestrates many at once.
 */

export interface BulkLookupResult {
  input: string
  ok: boolean
  error?: string
  product?: { gtin: string; varenavn: string | null; vareinfo: string | null; pris: string | null; enhetspris: string | null; pant: boolean; imageUrl: string }
}

/** Looks up many spar.no URLs/GTINs with limited concurrency (polite scraping). */
export async function bulkLookupSpar(inputs: string[]): Promise<BulkLookupResult[]> {
  const cleaned = inputs.map((s) => s.trim()).filter(Boolean).slice(0, 80)
  const results: BulkLookupResult[] = new Array(cleaned.length)
  const CONCURRENCY = 4
  let idx = 0
  async function worker() {
    while (idx < cleaned.length) {
      const i = idx++
      const input = cleaned[i]
      try {
        const res = await lookupSparProduct(input)
        results[i] = res.ok && res.product
          ? { input, ok: true, product: res.product }
          : { input, ok: false, error: res.error ?? "Ikke funnet" }
      } catch {
        results[i] = { input, ok: false, error: "Feil ved oppslag" }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, cleaned.length || 1) }, worker))
  return results
}

export interface BulkOfferRow {
  offer: OfferFields
  imageUrl: string | null
  avdeling: string
  /** Optional per-row period override (else the shared period is used). */
  validFrom?: string | null
  validTo?: string | null
}

export interface BulkShared {
  validFrom: string | null
  validTo: string | null
  targetMode: TargetMode
  storeIds: string[]
  tagIds: string[]
}

/** Creates one structured customer offer per row via the existing saveContent. */
export async function bulkCreateOffers(
  rows: BulkOfferRow[],
  shared: BulkShared,
  publish: boolean
): Promise<{ ok: boolean; created: number; failed: number }> {
  let created = 0
  let failed = 0
  for (const row of rows) {
    if (!row.offer.varenavn?.trim()) { failed++; continue }
    const input: ContentInput = {
      title: row.offer.varenavn.trim(),
      type: "slide",
      audience: "kunde",
      bodyHtml: "",
      imageUrl: row.imageUrl,
      imageUrls: row.imageUrl ? [row.imageUrl] : [],
      imageMode: "plakat",
      offer: row.offer,
      avdeling: row.avdeling || "felles",
      targetMode: shared.targetMode,
      storeIds: shared.storeIds,
      tagIds: shared.tagIds,
      validFrom: row.validFrom ?? shared.validFrom,
      validTo: row.validTo ?? shared.validTo,
      publish,
    }
    const res = await saveContent(input)
    if (res.ok) created++
    else failed++
  }
  return { ok: true, created, failed }
}
