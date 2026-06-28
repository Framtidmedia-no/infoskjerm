"use client"

import { useEffect, useState } from "react"
import { ModuleRenderer } from "@/components/modules/module-renderer"

interface SlideContent {
  id: string
  type: "news" | "competition" | "stats" | "weather" | "slide" | "clock"
  title?: string
  body?: string
  data?: Record<string, unknown>
}

const demoSlides: SlideContent[] = [
  {
    id: "1",
    type: "clock",
    title: "Velkommen",
  },
  {
    id: "2",
    type: "news",
    title: "Sommerferieåpningstider 2025",
    body: "Vi minner om at butikken har endrede åpningstider i juli. Hverdager: 08:00–20:00, Lørdag: 09:00–18:00. God sommer til alle ansatte!",
    data: {
      title: "Sommerferieåpningstider 2025",
      body: "Vi minner om at butikken har endrede åpningstider i juli. Hverdager: 08:00–20:00, Lørdag: 09:00–18:00. God sommer til alle ansatte!",
    },
  },
  {
    id: "3",
    type: "competition",
    title: "Ukens konkurranse",
    body: "Hvem selger mest i denne uken? Topplisten oppdateres daglig. Premie: Gavekort på 500 kr!",
    data: {
      title: "Ukens konkurranse",
      description: "Hvem selger mest i denne uken? Topplisten oppdateres daglig.",
      prize: "Gavekort på 500 kr",
      deadline: "Fredag 20. juni",
    },
  },
  {
    id: "4",
    type: "stats",
    title: "Salgstall — i dag",
    data: {
      title: "Salgstall — i dag",
      period: "Dag",
      target: 95000,
      actual: 87400,
    },
  },
  {
    id: "5",
    type: "weather",
    title: "Vær neste 7 dager",
    data: {
      location_name: "Ålesund",
      lat: 62.47,
      lon: 6.15,
    },
  },
]

function ClockSlide() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"]
  const months = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"]

  return (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <div className="mb-8">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-900/50">
          <span className="text-4xl font-bold text-white">GR</span>
        </div>
        <p className="text-center text-zinc-400 text-lg font-medium tracking-wide">Gange-Rolv</p>
      </div>
      <p className="text-9xl font-black tabular-nums tracking-tighter text-white">
        {time.getHours().toString().padStart(2, "0")}
        <span className="animate-pulse">:</span>
        {time.getMinutes().toString().padStart(2, "0")}
      </p>
      <p className="text-2xl text-zinc-400 mt-4 font-light">
        {days[time.getDay()]}, {time.getDate()}. {months[time.getMonth()]} {time.getFullYear()}
      </p>
    </div>
  )
}


export function ScreenDisplay({ token, screenId, storeId }: { token: string; screenId?: string; storeId?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    const durations: Record<string, number> = {
      clock: 10000,
      news: 12000,
      competition: 15000,
      stats: 12000,
      weather: 12000,
      slide: 10000,
    }

    const slide = demoSlides[currentIndex]
    const duration = durations[slide.type] ?? 10000

    const timer = setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % demoSlides.length)
        setIsTransitioning(false)
      }, 500)
    }, duration)

    return () => clearTimeout(timer)
  }, [currentIndex])

  const slide = demoSlides[currentIndex]

  return (
    <div className="w-screen h-screen bg-zinc-950 overflow-hidden relative" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 h-full transition-opacity duration-500"
        style={{ opacity: isTransitioning ? 0 : 1 }}
      >
        {slide.type === "clock" ? (
          <ClockSlide />
        ) : (
          <ModuleRenderer
            moduleKey={slide.type === "news" ? "internal-news" : slide.type === "competition" ? "competition" : slide.type === "stats" ? "sales-stats" : "weather"}
            fields={slide.data ?? {}}
          />
        )}
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-10 py-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-black">GR</span>
          </div>
          <span className="text-zinc-400 text-sm font-medium">Gange-Rolv</span>
        </div>

        {/* Slide indicators */}
        <div className="flex items-center gap-2">
          {demoSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all ${i === currentIndex ? "w-6 h-2 bg-white" : "w-2 h-2 bg-zinc-600"}`}
            />
          ))}
        </div>

        <ScreenClock />
      </div>
    </div>
  )
}

function ScreenClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="text-zinc-400 text-sm tabular-nums">
      {time.getHours().toString().padStart(2, "0")}:{time.getMinutes().toString().padStart(2, "0")}
    </span>
  )
}
