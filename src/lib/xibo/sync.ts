import { xiboFetch } from "./client"

/**
 * The DYNAMIC content model.
 *
 * Publishing a news item does NOT create a Xibo layout. Instead it upserts a
 * single ROW in the Xibo DataSet "Nyheter" (dataSetId 1). The base template
 * (layout 12 / campaign 8) has a DataSet View widget that rotates through these
 * rows. Add a news item → a row appears → it joins the rotation. Unpublish →
 * the row is removed.
 *
 * DataSet 1 columns (verified live):
 *   1 tittel  2 tekst  3 bilde  4 type  5 butikker  6 fra  7 til  8 contentId
 *
 * Row API (Xibo 4.4, verified):
 *   GET    /dataset/data/{id}              → rows: { id, tittel, tekst, ... }
 *   POST   /dataset/data/{id}              → { id: rowId }, fields dataSetColumnId_N
 *   PUT    /dataset/data/{id}/{rowId}      → same fields
 *   DELETE /dataset/data/{id}/{rowId}
 *
 * Note: Xibo String columns strip HTML tags, so `tekst` is stored as plain text.
 */

const NEWS_DATASET_ID = Number(process.env.XIBO_NEWS_DATASET_ID ?? 1)

/** Column ids in DataSet "Nyheter" (stable, verified live). */
const COL = {
  tittel: 1,
  tekst: 2,
  bilde: 3,
  type: 4,
  butikker: 5,
  fra: 6,
  til: 7,
  contentId: 8,
  dato: 9,
  forfatter: 10,
} as const

// Sentinel bounds so the template's date-window filter never has to deal with
// empty/NULL date cells (open-ended news shows always).
const DATE_FLOOR = "2000-01-01 00:00:00"
const DATE_CEIL = "2099-12-31 23:59:59"

export interface NewsRow {
  /** Supabase content_items.id — the stable key we match rows on. */
  contentId: string
  title: string
  /** Body as HTML; stored as plain text in the DataSet (Xibo strips tags). */
  bodyHtml: string
  imageUrl: string | null
  type: string
  /** Comma-separated Xibo display-group names, or "ALLE" for all stores. */
  stores: string
  validFrom: string | null
  validTo: string | null
  /** Pre-formatted Norwegian publish date shown on the card, e.g. "28. juni 2026". */
  displayDate: string
  /** Author display name shown on the card. */
  author: string
}

interface XiboDataRow {
  id: number
  contentId?: string | null
}

/** Strips HTML to plain text suitable for a DataSet string column. */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Xibo DataSet date columns expect `Y-m-d H:i:s`. */
function toXiboDate(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function rowForm(row: NewsRow): Record<string, string> {
  return {
    [`dataSetColumnId_${COL.tittel}`]: row.title,
    [`dataSetColumnId_${COL.tekst}`]: htmlToText(row.bodyHtml),
    [`dataSetColumnId_${COL.bilde}`]: row.imageUrl ?? "",
    [`dataSetColumnId_${COL.type}`]: row.type,
    [`dataSetColumnId_${COL.butikker}`]: row.stores,
    [`dataSetColumnId_${COL.fra}`]: toXiboDate(row.validFrom) || DATE_FLOOR,
    [`dataSetColumnId_${COL.til}`]: toXiboDate(row.validTo) || DATE_CEIL,
    [`dataSetColumnId_${COL.contentId}`]: row.contentId,
    [`dataSetColumnId_${COL.dato}`]: row.displayDate,
    [`dataSetColumnId_${COL.forfatter}`]: row.author,
  }
}

/** Finds the existing DataSet row whose contentId matches (or null). */
async function findRowId(contentId: string): Promise<number | null> {
  const rows = await xiboFetch<XiboDataRow[]>(`/dataset/data/${NEWS_DATASET_ID}`)
  const match = rows.find((r) => String(r.contentId ?? "") === contentId)
  return match?.id ?? null
}

/**
 * Upserts the news item as a single DataSet row. Matches on contentId, so
 * re-publishing the same item updates its row instead of duplicating it.
 * Returns the Xibo rowId.
 */
export async function upsertNewsRow(row: NewsRow): Promise<number> {
  const form = rowForm(row)
  const existingId = await findRowId(row.contentId)
  if (existingId) {
    await xiboFetch(`/dataset/data/${NEWS_DATASET_ID}/${existingId}`, { method: "PUT", form })
    return existingId
  }
  const created = await xiboFetch<{ id: number }>(`/dataset/data/${NEWS_DATASET_ID}`, { method: "POST", form })
  return created.id
}

/** Removes the news item's DataSet row (on unpublish/delete). No-op if absent. */
export async function deleteNewsRow(contentId: string): Promise<void> {
  const id = await findRowId(contentId)
  if (id) {
    await xiboFetch(`/dataset/data/${NEWS_DATASET_ID}/${id}`, { method: "DELETE" }).catch(() => {})
  }
}

export const newsDatasetId = NEWS_DATASET_ID
