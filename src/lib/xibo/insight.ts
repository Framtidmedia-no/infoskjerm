import { xiboFetch, listDisplays, type XiboDisplay } from "./client"
import { parseLastSeen } from "./screens"

/**
 * Estate-wide screen insight read live from the Xibo engine: current player
 * faults (so an admin sees trouble before a customer does) and proof-of-play
 * stats (what actually showed on screens, and how often). Read-only. Every call
 * is defensive — a screen-engine hiccup yields an empty result, never a crash,
 * and an empty estate (no Pis connected yet) simply returns nothing.
 *
 * NB: Xibo's /fault endpoint only holds faults a *running* player reported
 * (download/XMR/widget errors). A screen that lost power or network simply stops
 * checking in — it can't report a fault. That "offline" signal lives on the
 * display itself (loggedIn / lastAccessed), so we derive it separately and merge
 * it in; otherwise a dark screen shows "Ingen feil" for days.
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

/**
 * Sortable epoch (ms) from Xibo's lastAccessed — a unix-seconds number or a naive
 * "YYYY-MM-DD HH:mm:ss" string. Only used to order faults most-stale-first, so a
 * uniform timezone skew on the naive string is harmless. Never-seen → -Infinity
 * (most severe, sorts first).
 */
function lastSeenSortKey(raw: string | null): number {
  if (!raw) return -Infinity
  const n = Number(raw)
  if (Number.isFinite(n) && n > 0) return n * 1000
  const ms = Date.parse(raw.replace(" ", "T"))
  return Number.isFinite(ms) ? ms : -Infinity
}

/**
 * Turn offline displays into faults. "Offline" here matches the rest of the app
 * (screens.ts, the "Frakoblet" badge): the player is not currently logged in.
 * Most-stale-first so the screen that's been dark longest is at the top.
 */
export function offlineFaultsFromDisplays(
  displays: Pick<XiboDisplay, "displayId" | "display" | "loggedIn" | "lastAccessed">[]
): ScreenFault[] {
  return displays
    .filter((d) => d.loggedIn !== 1)
    .sort((a, b) => lastSeenSortKey(a.lastAccessed) - lastSeenSortKey(b.lastAccessed))
    .map((d) => ({
      displayId: d.displayId ?? null,
      display: d.display ?? null,
      code: "OFFLINE",
      description: "Skjermen er frakoblet",
      since: d.lastAccessed ? `sist sett ${parseLastSeen(d.lastAccessed)}` : "har aldri koblet til",
    }))
}

async function fetchOfflineFaults(): Promise<ScreenFault[]> {
  try {
    const displays = await listDisplays()
    return offlineFaultsFromDisplays(displays ?? [])
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

  const [reported, offline, topPlays] = await Promise.all([
    fetchFaults(),
    fetchOfflineFaults(),
    fetchTopPlays(from, to),
  ])
  // Offline screens first — a dark screen is the most urgent thing to see —
  // then player-reported faults.
  return { faults: [...offline, ...reported], topPlays, from, to }
}
