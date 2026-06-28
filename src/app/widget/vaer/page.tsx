import { fetchForecast, symbolToGlyph, dayLabel } from "@/lib/weather/yr"

/**
 * Public weather widget, embedded into the Xibo base template as a webpage.
 * Renders per-store weather from Yr.no. Usage: /widget/vaer?lat=62.47&lon=6.15&navn=Ålesund
 *
 * Public (no auth — middleware only guards /admin). Designed to sit in the
 * template's right column against the dark gradient.
 */

export const dynamic = "force-dynamic"

interface SearchParams {
  lat?: string
  lon?: string
  navn?: string
}

function parseNum(v: string | undefined): number {
  return v === undefined ? NaN : Number(v)
}

export default async function WeatherWidgetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { lat: latRaw, lon: lonRaw, navn } = await searchParams
  const lat = parseNum(latRaw)
  const lon = parseNum(lonRaw)
  const forecast = await fetchForecast(lat, lon)

  const todayIso = new Date().toISOString().slice(0, 10)
  const locationName = navn?.trim() || "Været"

  return (
    <main
      style={{
        margin: 0,
        width: "100%",
        minHeight: "100vh",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "44px 40px",
        background: "linear-gradient(160deg,#0a0a0a,#161616)",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 8, height: 8, borderRadius: 9999, background: "#16a34a", display: "inline-block" }} />
        <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
          {locationName}
        </span>
      </header>

      {!forecast ? (
        <div style={{ fontSize: 30, color: "rgba(255,255,255,0.5)" }}>Vær ikke tilgjengelig</div>
      ) : (
        <>
          <section style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <span style={{ fontSize: 132, lineHeight: 1 }}>{symbolToGlyph(forecast.current.symbolCode)}</span>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
              <span style={{ fontSize: 140, fontWeight: 900, lineHeight: 0.9 }}>{forecast.current.temperature}</span>
              <span style={{ fontSize: 56, fontWeight: 700, marginTop: 8, color: "rgba(255,255,255,0.7)" }}>°</span>
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: `repeat(${forecast.days.length}, 1fr)`, gap: 14 }}>
            {forecast.days.map((d) => (
              <div
                key={d.date}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                  padding: "16px 8px",
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ fontSize: 20, fontWeight: 600, textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                  {dayLabel(d.date, todayIso)}
                </span>
                <span style={{ fontSize: 46, lineHeight: 1 }}>{symbolToGlyph(d.symbolCode)}</span>
                <span style={{ fontSize: 26, fontWeight: 800 }}>
                  {d.tempMax ?? "–"}°
                  {d.tempMin !== null && (
                    <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 600 }}> / {d.tempMin}°</span>
                  )}
                </span>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  )
}
