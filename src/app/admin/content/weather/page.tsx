import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CloudSun, Pencil } from "lucide-react"

const storeWeather = [
  { store: "EUROSPAR BLINDHEIM", city: "Ålesund", lat: "62.4724", lon: "6.1549", forecast: ["☀️", "⛅", "🌧️", "⛅", "☀️", "☀️", "⛅"], temps: [19, 18, 14, 16, 21, 22, 18] },
  { store: "EUROSPAR HAREID", city: "Hareid", lat: "62.3695", lon: "6.0249", forecast: ["☀️", "⛅", "🌧️", "⛅", "☀️", "☀️", "⛅"], temps: [18, 17, 13, 15, 20, 21, 17] },
  { store: "EUROSPAR MOA", city: "Ålesund", lat: "62.4724", lon: "6.1549", forecast: ["☀️", "⛅", "🌧️", "⛅", "☀️", "☀️", "⛅"], temps: [19, 18, 14, 16, 21, 22, 18] },
  { store: "EUROSPAR LARSGÅRDEN", city: "Ålesund", lat: "62.4724", lon: "6.1549", forecast: ["☀️", "⛅", "🌧️", "⛅", "☀️", "☀️", "⛅"], temps: [19, 18, 14, 16, 21, 22, 18] },
  { store: "EUROSPAR ÅLESUND STORSENTER", city: "Ålesund", lat: "62.4724", lon: "6.1549", forecast: ["☀️", "⛅", "🌧️", "⛅", "☀️", "☀️", "⛅"], temps: [19, 18, 14, 16, 21, 22, 18] },
  { store: "EUROSPAR ØRSTA", city: "Ørsta", lat: "62.2006", lon: "6.1315", forecast: ["⛅", "🌧️", "🌧️", "⛅", "☀️", "⛅", "🌦️"], temps: [17, 14, 13, 16, 19, 17, 16] },
  { store: "JOKER GODØY", city: "Giske", lat: "62.4986", lon: "6.0632", forecast: ["☀️", "☀️", "⛅", "⛅", "☀️", "☀️", "⛅"], temps: [20, 20, 17, 16, 22, 23, 19] },
  { store: "JOKER ÅHEIM", city: "Sande", lat: "62.3500", lon: "5.6833", forecast: ["⛅", "⛅", "🌧️", "⛅", "☀️", "☀️", "⛅"], temps: [18, 17, 13, 15, 20, 21, 17] },
  { store: "SPAR HORNINDAL", city: "Hornindal", lat: "61.9681", lon: "6.5233", forecast: ["☀️", "⛅", "🌧️", "🌦️", "☀️", "☀️", "⛅"], temps: [21, 19, 15, 17, 23, 24, 20] },
  { store: "SPAR RAUDEBERG", city: "Vågsøy", lat: "61.9861", lon: "5.1380", forecast: ["🌧️", "🌧️", "🌧️", "⛅", "⛅", "☀️", "⛅"], temps: [15, 14, 13, 16, 17, 19, 17] },
  { store: "SPAR ULSTEINVIK", city: "Ulstein", lat: "62.3432", lon: "5.8515", forecast: ["☀️", "⛅", "🌧️", "⛅", "☀️", "☀️", "⛅"], temps: [18, 17, 13, 15, 20, 21, 17] },
]

const days = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"]

export default function WeatherPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Vær"
        subtitle="Automatisk yr.no-data basert på butikkens koordinater"
        actions={<Button size="sm" variant="outline"><Pencil className="w-4 h-4" />Rediger lokasjoner</Button>}
      />
      <div className="flex-1 p-6">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CloudSun className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Automatisk værhenting fra yr.no</p>
            <p className="text-xs text-blue-700 mt-0.5">Skjermene henter vær automatisk basert på GPS-koordinatene til hver butikk. Oppdateres hver 30. minutt. API-kobling aktiveres i neste fase.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {storeWeather.map((s) => (
            <Card key={s.store} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-zinc-900 text-sm">{s.store}</p>
                    <p className="text-xs text-zinc-400">{s.city} — {s.lat}°N, {s.lon}°Ø</p>
                  </div>
                  <span className="text-2xl">{s.forecast[0]}</span>
                </div>
                <div className="flex gap-2">
                  {days.map((day, i) => (
                    <div key={day} className="flex-1 text-center bg-zinc-50 rounded-lg py-2">
                      <p className="text-[9px] text-zinc-400 uppercase">{day}</p>
                      <p className="text-sm my-0.5">{s.forecast[i]}</p>
                      <p className="text-xs font-semibold text-zinc-700">{s.temps[i]}°</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
