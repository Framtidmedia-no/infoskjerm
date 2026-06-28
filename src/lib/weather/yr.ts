/**
 * Yr.no / MET Norway weather client for the in-store weather widget.
 *
 * Uses the free Locationforecast 2.0 API. MET's terms require:
 *  - an identifying User-Agent (with contact),
 *  - coordinates truncated to ≤4 decimals,
 *  - caching / not polling more often than the data changes.
 * We cache responses for 30 min via Next's fetch revalidation.
 */

const YR_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact"
const USER_AGENT = "Gange-Rolv-Infoskjerm/1.0 (https://framtidtech.no; franklunde1981@gmail.com)"
const REVALIDATE_SECONDS = 1800

export interface CurrentWeather {
  temperature: number
  symbolCode: string
  precipitation: number | null
}

export interface DayForecast {
  /** ISO date (YYYY-MM-DD). */
  date: string
  symbolCode: string
  tempMax: number | null
  tempMin: number | null
}

export interface WeatherForecast {
  current: CurrentWeather
  days: DayForecast[]
}

interface YrInstantDetails {
  air_temperature?: number
}
interface YrPeriod {
  summary?: { symbol_code?: string }
  details?: { air_temperature_max?: number; air_temperature_min?: number; precipitation_amount?: number }
}
interface YrTimeseries {
  time: string
  data: {
    instant: { details: YrInstantDetails }
    next_1_hours?: YrPeriod
    next_6_hours?: YrPeriod
  }
}
interface YrResponse {
  properties: { timeseries: YrTimeseries[] }
}

function truncCoord(value: number): string {
  return value.toFixed(4)
}

/** Fetches and normalises the forecast for a coordinate. Returns null on failure. */
export async function fetchForecast(lat: number, lon: number): Promise<WeatherForecast | null> {
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null

  const url = `${YR_URL}?lat=${truncCoord(lat)}&lon=${truncCoord(lon)}`
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!res.ok) return null
    const json = (await res.json()) as YrResponse
    return normalise(json)
  } catch {
    return null
  }
}

function normalise(json: YrResponse): WeatherForecast | null {
  const series = json.properties?.timeseries ?? []
  const first = series[0]
  if (!first) return null

  const current: CurrentWeather = {
    temperature: Math.round(first.data.instant.details.air_temperature ?? 0),
    symbolCode: first.data.next_1_hours?.summary?.symbol_code ?? first.data.next_6_hours?.summary?.symbol_code ?? "cloudy",
    precipitation: first.data.next_1_hours?.details?.precipitation_amount ?? null,
  }

  // One representative entry per day: prefer the 12:00 slot, fall back to first.
  const byDay = new Map<string, YrTimeseries[]>()
  for (const ts of series) {
    const date = ts.time.slice(0, 10)
    const list = byDay.get(date) ?? []
    list.push(ts)
    byDay.set(date, list)
  }

  const days: DayForecast[] = []
  for (const [date, entries] of byDay) {
    const midday = entries.find((e) => e.time.slice(11, 13) === "12") ?? entries[0]
    const period = midday.data.next_6_hours ?? midday.data.next_1_hours
    const temps = entries
      .map((e) => e.data.instant.details.air_temperature)
      .filter((t): t is number => typeof t === "number")
    days.push({
      date,
      symbolCode: period?.summary?.symbol_code ?? "cloudy",
      tempMax: temps.length ? Math.round(Math.max(...temps)) : null,
      tempMin: temps.length ? Math.round(Math.min(...temps)) : null,
    })
    if (days.length >= 4) break
  }

  return { current, days }
}

/** Maps a MET symbol_code to an emoji glyph (self-contained, no asset shipping). */
export function symbolToGlyph(symbolCode: string): string {
  const base = symbolCode.replace(/_(day|night|polartwilight)$/, "")
  const map: Record<string, string> = {
    clearsky: "☀️",
    fair: "🌤️",
    partlycloudy: "⛅",
    cloudy: "☁️",
    fog: "🌫️",
    lightrainshowers: "🌦️",
    rainshowers: "🌦️",
    heavyrainshowers: "🌧️",
    lightrain: "🌦️",
    rain: "🌧️",
    heavyrain: "🌧️",
    lightrainshowersandthunder: "⛈️",
    rainandthunder: "⛈️",
    heavyrainandthunder: "⛈️",
    lightsleet: "🌨️",
    sleet: "🌨️",
    heavysleet: "🌨️",
    sleetshowers: "🌨️",
    lightsnow: "🌨️",
    snow: "❄️",
    heavysnow: "❄️",
    snowshowers: "🌨️",
    lightsnowshowers: "🌨️",
  }
  return map[base] ?? "🌡️"
}

/** Norwegian short weekday label for an ISO date, "I dag" for today. */
export function dayLabel(isoDate: string, todayIso: string): string {
  if (isoDate === todayIso) return "I dag"
  const d = new Date(`${isoDate}T12:00:00`)
  return d.toLocaleDateString("nb-NO", { weekday: "short" }).replace(".", "")
}
