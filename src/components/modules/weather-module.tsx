"use client"

import { useEffect, useState } from "react"
import { CloudSun, Wind, Droplets, Sun, Cloud, CloudRain, Snowflake } from "lucide-react"
import type { WeatherData } from "@/app/api/weather/route"

type IconComponent = React.ComponentType<{ className?: string }>

const SYMBOL_ICONS: Record<string, IconComponent> = {
  clearsky_day: Sun as IconComponent,
  fair_day: Sun as IconComponent,
  partlycloudy_day: CloudSun as IconComponent,
  cloudy: Cloud as IconComponent,
  rain: CloudRain as IconComponent,
  heavyrain: CloudRain as IconComponent,
  snow: Snowflake as IconComponent,
  heavysnow: Snowflake as IconComponent,
}

function WeatherIcon({ code, className }: { code: string; className?: string }) {
  const entry = Object.entries(SYMBOL_ICONS).find(([k]) => code.startsWith(k.split("_")[0]))
  const Icon = entry ? entry[1] : CloudSun as IconComponent
  return <Icon className={className} />
}

const DAY_NO = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"]

interface Props { fields: Record<string, unknown> }

export function WeatherModule({ fields }: Props) {
  const locationName = (fields.location_name as string) || "Lokalt"
  const lat = (fields.lat as number) ?? 62.47
  const lon = (fields.lon as number) ?? 6.15
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d: WeatherData) => setWeather(d))
      .catch(() => {})
  }, [lat, lon])

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(160deg, #050d1a 0%, #091525 60%, #0c1e30 100%)' }}
    >
      <div className="h-2 w-full bg-sky-500" />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        {/* Header */}
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-400 mb-1">Vær</p>
          <p className="text-base text-white/40 font-medium">{locationName}</p>
        </div>

        {/* Current temp */}
        <div className="flex items-end gap-8">
          {weather ? (
            <>
              <div>
                <WeatherIcon code={weather.current.symbolCode} className="w-24 h-24 text-sky-300 mb-4" />
                <p className="text-[10rem] font-black leading-none tabular-nums">
                  {weather.current.temperature}°
                </p>
              </div>
              <div className="pb-6 space-y-3">
                <div className="flex items-center gap-3 text-white/50 text-lg">
                  <Wind className="w-5 h-5" />
                  <span>{weather.current.windSpeed} m/s</span>
                </div>
                <div className="flex items-center gap-3 text-white/50 text-lg">
                  <Droplets className="w-5 h-5" />
                  <span>{weather.current.humidity}%</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-[10rem] font-black leading-none text-white/30">--°</p>
          )}
        </div>

        {/* Forecast */}
        {weather && (
          <div className="flex gap-4">
            {weather.forecast.map((day) => {
              const d = new Date(day.date)
              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center gap-2 rounded-2xl px-6 py-4"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                >
                  <span className="text-white/40 text-sm font-medium">{DAY_NO[d.getDay()]}</span>
                  <WeatherIcon code={day.symbolCode} className="w-8 h-8 text-sky-300" />
                  <span className="text-white font-bold text-lg">{day.high}°</span>
                  <span className="text-white/40 text-sm">{day.low}°</span>
                  {day.precipitation > 0 && (
                    <span className="text-sky-400 text-xs">{day.precipitation}mm</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
