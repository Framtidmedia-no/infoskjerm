/**
 * Strømplan for skjermer: skal TV-en/visningen være PÅ akkurat nå?
 *
 * Ren, klient-trygg beregning uten I/O — brukes av API-et (Pi-agent + kiosk),
 * server actions (override-utløp) og admin-UI (statuslinjer). All tid regnes i
 * minutt-rom relativt til Oslo-midnatt: DST-grensene (02–03 om natten) treffer
 * aldri butikkenes åpne vinduer, så minutt-aritmetikk er trygt her.
 *
 * Trygg default: mangler åpningstider helt (aldri konfigurert) → alltid PÅ.
 * Manglende konfig skal aldri svarte skjermer i butikk.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const
export type DayKey = (typeof DAY_KEYS)[number]

export interface DayHours {
  opens: string // "HH:MM"
  closes: string // "HH:MM"
}

/** null-dag = stengt. Hele objektet null/undefined = aldri konfigurert (alltid på). */
export type OpeningHours = Partial<Record<DayKey, DayHours | null>>

export type PowerMode = "auto" | "always_on"
export type PowerValue = "on" | "off"

export interface PowerInput {
  hours: OpeningHours | null | undefined
  mode: PowerMode
  leadMin: number
  lagMin: number
  override?: PowerValue | null
  overrideUntil?: string | Date | null
  now?: Date
}

export interface PowerDecision {
  desired: PowerValue
  /** Maskinlesbar årsak — UI oversetter til tekst. */
  reason: "always_on" | "override" | "schedule" | "no_hours"
  /** Neste planlagte overgang (fra åpningstidene), null uten plan. */
  nextTransition: Date | null
}

const MIN_PER_DAY = 24 * 60

/** "HH:MM" → minutter siden midnatt. Ugyldig format → null. */
export function parseHm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function formatHm(minutes: number): string {
  const m = ((minutes % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`
}

/** Ukedag (0 = mandag) + minutter siden midnatt i Europe/Oslo for et tidspunkt. */
export function osloClock(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ""
  const dayIdx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"))
  // Intl kan gi "24" for midnatt i enkelte motorer — normaliser til 0.
  const hour = Number(get("hour")) % 24
  return { day: dayIdx < 0 ? 0 : dayIdx, minutes: hour * 60 + Number(get("minute")) }
}

interface Interval {
  start: number
  end: number
}

/**
 * PÅ-intervaller i minutt-rom rundt nå (0 = Oslo-midnatt i dag), for dag-offset
 * −1..+7. closes ≤ opens tolkes som at vinduet krysser midnatt (+24 t).
 */
function intervalsAround(hours: OpeningHours, todayIdx: number, leadMin: number, lagMin: number): Interval[] {
  const out: Interval[] = []
  for (let offset = -1; offset <= 7; offset++) {
    const key = DAY_KEYS[(((todayIdx + offset) % 7) + 7) % 7]
    const day = hours[key]
    if (!day) continue
    const opens = parseHm(day.opens)
    const closes = parseHm(day.closes)
    if (opens == null || closes == null) continue
    const base = offset * MIN_PER_DAY
    const end = closes <= opens ? closes + MIN_PER_DAY : closes
    out.push({ start: base + opens - leadMin, end: base + end + lagMin })
  }
  return out
}

/** Har tenanten faktisk konfigurert noen åpne dager? */
export function hasConfiguredHours(hours: OpeningHours | null | undefined): boolean {
  if (!hours) return false
  return DAY_KEYS.some((k) => {
    const d = hours[k]
    return !!d && parseHm(d.opens) != null && parseHm(d.closes) != null
  })
}

/**
 * Neste planlagte overgang etter nå (i minutter frem), eller null uten plan.
 * Overlappende vinduer flates ut så en grense inni et sammenhengende
 * PÅ-område ikke regnes som overgang.
 */
function nextBoundaryAfter(intervals: Interval[], nowMin: number): number | null {
  const inside = (t: number) => intervals.some((i) => t >= i.start && t < i.end)
  const candidates = intervals
    .flatMap((i) => [i.start, i.end])
    .filter((t) => t > nowMin)
    .sort((a, b) => a - b)
  const nowInside = inside(nowMin)
  for (const t of candidates) {
    // Ekte overgang = tilstanden rett etter grensen skiller seg fra nå.
    if (inside(t) !== nowInside) return t
  }
  return null
}

/** Hovedbeslutningen: skal skjermen være på nå, og når snur det? */
export function resolveDesiredPower(input: PowerInput): PowerDecision {
  const now = input.now ?? new Date()
  const { day, minutes } = osloClock(now)

  const configured = hasConfiguredHours(input.hours)
  const intervals = configured
    ? intervalsAround(input.hours as OpeningHours, day, Math.max(0, input.leadMin), Math.max(0, input.lagMin))
    : []
  const boundary = configured ? nextBoundaryAfter(intervals, minutes) : null
  const nextTransition = boundary == null ? null : new Date(now.getTime() + (boundary - minutes) * 60_000)

  if (input.mode === "always_on") {
    return { desired: "on", reason: "always_on", nextTransition: null }
  }

  if (input.override === "on" || input.override === "off") {
    const until = input.overrideUntil ? new Date(input.overrideUntil) : null
    if (until && until.getTime() > now.getTime()) {
      return { desired: input.override, reason: "override", nextTransition: until }
    }
  }

  if (!configured) {
    return { desired: "on", reason: "no_hours", nextTransition: null }
  }

  const on = intervals.some((i) => minutes >= i.start && minutes < i.end)
  return { desired: on ? "on" : "off", reason: "schedule", nextTransition }
}
