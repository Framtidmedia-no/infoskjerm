import { fetchForecast } from "@/lib/weather/yr"
import { TopbarClient } from "./topbar-client"

/**
 * Top strip embedded into the Xibo base/store layouts as a full-width webpage:
 * store name + live clock + date + current weather + a compact 4-day forecast.
 *
 * Usage: /widget/topbar?butikk=EUROSPAR%20MOA&lat=62.47&lon=6.15&navn=Ålesund
 */

export const dynamic = "force-dynamic"

interface SearchParams {
  butikk?: string
  lat?: string
  lon?: string
  navn?: string
}

export default async function TopbarWidgetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { butikk, lat, lon } = await searchParams
  const forecast = await fetchForecast(Number(lat), Number(lon))
  const todayIso = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" }) // YYYY-MM-DD

  return <TopbarClient butikk={butikk?.trim() || "Gange-Rolv"} forecast={forecast} todayIso={todayIso} />
}
