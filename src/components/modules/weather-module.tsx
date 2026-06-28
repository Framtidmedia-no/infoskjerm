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
  const locationName = (fields.location_name as string) || "Stedet"
  const lat = (fields.lat as number) ?? 62.47
  const lon = (fields.lon as number) ?? 6.15
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d: WeatherData) => setWeather(d))
      .catch(() => {})
  }, [lat, lon])

  if (!weather) {
    return (
      <div className="flex flex-col justify-center h-full px-20 text-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <CloudSun className="w-7 h-7 text-sky-400 animate-pulse" />
          </div>
          <span className="text-sky-400 font-semibold text-lg uppercase tracking-widest">Vær — {locationName}</span>
        </div>
        <p className="text-9xl font-black">--°</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <WeatherIcon code={weather.current.symbolCode} className="w-7 h-7 text-sky-400" />
        </div>
        <span className="text-sky-400 font-semibold text-lg uppercase tracking-widest">Vær — {locationName}</span>
      </div>
      <div className="flex items-end gap-8 mb-8">
        <p className="text-9xl font-black">{weather.current.temperature}°</p>
        <div className="pb-4">
          <div className="flex gap-6 text-zinc-400">
            <div className="flex items-center gap-2"><Wind className="w-4 h-4" /><span>{weather.current.windSpeed} m/s</span></div>
            <div className="flex items-center gap-2"><Droplets className="w-4 h-4" /><span>{weather.current.humidity}%</span></div>
          </div>
        </div>
      </div>
      <div className="flex gap-6">
        {weather.forecast.map((day) => {
          const d = new Date(day.date)
          return (
            <div key={day.date} className="flex flex-col items-center gap-2 bg-white/5 rounded-2xl px-5 py-4">
              <span className="text-zinc-400 text-sm">{DAY_NO[d.getDay()]}</span>
              <WeatherIcon code={day.symbolCode} className="w-8 h-8 text-sky-300" />
              <span className="text-white font-bold">{day.high}°</span>
              <span className="text-zinc-500 text-sm">{day.low}°</span>
              {day.precipitation > 0 && (
                <span className="text-sky-400 text-xs">{day.precipitation}mm</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
