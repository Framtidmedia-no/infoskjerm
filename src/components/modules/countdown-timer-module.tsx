"use client"
import { useState, useEffect } from "react"

interface Props { fields: Record<string, unknown> }

interface TimeUnit {
  value: number
  label: string
}

function FlipCard({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0")
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-28" style={{ perspective: "400px" }}>
        {/* Static card display */}
        <div className="w-full h-full bg-zinc-900 rounded-xl flex items-center justify-center shadow-2xl ring-1 ring-white/10">
          <span className="text-7xl font-black text-white font-mono tabular-nums leading-none">{display}</span>
        </div>
        {/* Horizontal divider line */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-black/60 z-10" />
      </div>
      <span className="text-white/40 text-xs uppercase tracking-widest font-medium">{label}</span>
    </div>
  )
}

export function CountdownTimerModule({ fields }: Props) {
  const title = (fields.title as string) || ""
  const targetDate = (fields.target_date as string) || ""

  const [timeLeft, setTimeLeft] = useState<TimeUnit[]>([])
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    function calculate() {
      if (!targetDate) return
      const target = new Date(targetDate).getTime()
      const now = Date.now()
      const diff = target - now

      if (diff <= 0) {
        setExpired(true)
        setTimeLeft([
          { value: 0, label: "Dager" },
          { value: 0, label: "Timer" },
          { value: 0, label: "Min" },
          { value: 0, label: "Sek" },
        ])
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft([
        { value: days, label: "Dager" },
        { value: hours, label: "Timer" },
        { value: minutes, label: "Min" },
        { value: seconds, label: "Sek" },
      ])
    }

    calculate()
    const interval = setInterval(calculate, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (!targetDate) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-950">
        <p className="text-zinc-500 text-xl">Ingen dato satt</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-zinc-950 gap-8 px-8">
      {title && (
        <h2 className="text-white text-4xl font-bold text-center">{title}</h2>
      )}
      {expired ? (
        <p className="text-emerald-400 text-5xl font-black animate-pulse">🎉 Nådd!</p>
      ) : (
        <div className="flex items-start gap-6">
          {timeLeft.map((unit) => (
            <FlipCard key={unit.label} value={unit.value} label={unit.label} />
          ))}
        </div>
      )}
    </div>
  )
}
