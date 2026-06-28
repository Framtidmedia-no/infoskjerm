import { NextRequest, NextResponse } from "next/server"

export const revalidate = 3600

interface YrTimeseries {
  time: string
  data: {
    instant: { details: { air_temperature: number; wind_speed: number; relative_humidity: number } }
    next_1_hours?: { summary: { symbol_code: string } }
    next_6_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } }
  }
}

export interface WeatherData {
  current: {
    temperature: number
    windSpeed: number
    humidity: number
    symbolCode: string
    locationName: string
  }
  forecast: Array<{
    date: string
    high: number
    low: number
    symbolCode: string
    precipitation: number
  }>
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const lat = req.nextUrl.searchParams.get("lat")
  const lon = req.nextUrl.searchParams.get("lon")

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat og lon er påkrevd" }, { status: 400 })
  }

  const yrUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`

  try {
    const res = await fetch(yrUrl, {
      headers: {
        "User-Agent": "infoskjerm/1.0 contact@framtidmedia.no",
        "Accept": "application/json",
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Yr.no svarte ${res.status}` }, { status: 502 })
    }

    const yrData = await res.json() as { properties: { timeseries: YrTimeseries[] } }
    const timeseries = yrData.properties.timeseries

    if (!timeseries || timeseries.length === 0) {
      return NextResponse.json({ error: "Ingen data fra Yr.no" }, { status: 502 })
    }

    const now = timeseries[0]
    const current: WeatherData["current"] = {
      temperature: Math.round(now.data.instant.details.air_temperature),
      windSpeed: Math.round(now.data.instant.details.wind_speed * 10) / 10,
      humidity: Math.round(now.data.instant.details.relative_humidity),
      symbolCode: now.data.next_1_hours?.summary.symbol_code ?? "cloudy",
      locationName: "",
    }

    const dailyMap = new Map<string, { highs: number[]; lows: number[]; symbol: string; precip: number[] }>()

    for (const ts of timeseries.slice(0, 120)) {
      const d = ts.time.slice(0, 10)
      if (!dailyMap.has(d)) dailyMap.set(d, { highs: [], lows: [], symbol: "", precip: [] })
      const entry = dailyMap.get(d)!
      const temp = ts.data.instant.details.air_temperature
      entry.highs.push(temp)
      entry.lows.push(temp)
      if (ts.data.next_6_hours) {
        entry.symbol = ts.data.next_6_hours.summary.symbol_code
        entry.precip.push(ts.data.next_6_hours.details.precipitation_amount)
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    const forecast: WeatherData["forecast"] = Array.from(dailyMap.entries())
      .filter(([date]) => date > today)
      .slice(0, 5)
      .map(([date, v]) => ({
        date,
        high: Math.round(Math.max(...v.highs)),
        low: Math.round(Math.min(...v.lows)),
        symbolCode: v.symbol,
        precipitation: Math.round(v.precip.reduce((a, b) => a + b, 0) * 10) / 10,
      }))

    return NextResponse.json({ current, forecast } satisfies WeatherData)
  } catch (err) {
    console.error("Yr.no fetch feilet:", err)
    return NextResponse.json({ error: "Kunne ikke hente værvarselet" }, { status: 502 })
  }
}
