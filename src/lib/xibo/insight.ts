import { xiboFetch } from "./client"

/**
 * Estate-wide screen insight read live from the Xibo engine: current player
 * faults (so an admin sees trouble before a customer does) and proof-of-play
 * stats (what actually showed on screens, and how often). Read-only. Every call
 * is defensive — a screen-engine hiccup yields an empty result, never a crash,
 * and an empty estate (no Pis connected yet) simply returns nothing.
 */

export interface ScreenFault {
  displayId: number | null
  display: string | null
  code: string | null
  description: string
  since: string | null
}

export interface PlaySummaryRow {
  layout: string
  plays: number
  /** Total seconds on screen across the window. */
  durationSec: number
}

export interface ScreenInsight {
  faults: ScreenFault[]
  topPlays: PlaySummaryRow[]
  /** Inclusive date window the play stats cover (YYYY-MM-DD). */
  from: string
  to: string
}

/** Xibo list endpoints return either a bare array or a { data: [...] } envelope. */
function rows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[]
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: Record<string, unknown>[] }).data
  }
  return []
}

function toNum(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function toStr(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : v != null ? String(v) : null
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

async function fetchFaults(): Promise<ScreenFault[]> {
  try {
    const data = await xiboFetch<unknown>("/fault", { query: { length: 200 } })
    return rows(data).map((f) => ({
      displayId: f.displayId != null ? toNum(f.displayId) : null,
      display: toStr(f.display),
      code: toStr(f.code),
      description: toStr(f.description) ?? "Ukjent feil",
      since: toStr(f.incidentDt ?? f.date),
    }))
  } catch {
    return []
  }
}

async function fetchTopPlays(from: string, to: string): Promise<PlaySummaryRow[]> {
  try {
    const data = await xiboFetch<unknown>("/stats", {
      query: { type: "Layout", fromDt: from, toDt: to, length: 1000 },
    })
    // Aggregate per layout name across displays.
    const byLayout = new Map<string, PlaySummaryRow>()
    for (const r of rows(data)) {
      const layout = toStr(r.layout) ?? toStr(r.media) ?? "(ukjent)"
      const prev = byLayout.get(layout) ?? { layout, plays: 0, durationSec: 0 }
      prev.plays += toNum(r.numberPlays ?? r.count)
      prev.durationSec += toNum(r.duration)
      byLayout.set(layout, prev)
    }
    return [...byLayout.values()].sort((a, b) => b.plays - a.plays).slice(0, 8)
  } catch {
    return []
  }
}

export async function fetchScreenInsight(windowDays = 7): Promise<ScreenInsight> {
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - windowDays)
  const from = isoDate(start)
  const to = isoDate(now)

  const [faults, topPlays] = await Promise.all([fetchFaults(), fetchTopPlays(from, to)])
  return { faults, topPlays, from, to }
}
