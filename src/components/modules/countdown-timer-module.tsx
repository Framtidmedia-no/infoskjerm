"use client"
import { useState, useEffect } from "react"

interface Props { fields: Record<string, unknown> }

interface TimeUnit {
  value: number
  label: string
}

function TimeBlock({ value, label }: { value: number; label: string }) {
  const display = String(value).padStart(2, "0")
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: '10rem',
          height: '11rem',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span
          className="text-8xl font-black font-mono tabular-nums leading-none text-white"
        >
          {display}
        </span>
      </div>
      <span className="text-sm font-bold uppercase tracking-[0.25em] text-white/40">
        {label}
      </span>
    </div>
  )
}

function Separator() {
  return (
    <span className="text-6xl font-black text-white/20 pb-8 select-none">:</span>
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
      <div
        className="flex flex-col h-full text-white"
        style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
      >
        <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />
        <div className="flex items-center justify-center flex-1">
          <p className="text-base text-white/40 font-medium">Ingen dato satt</p>
        </div>
      </div>
    )
  }

  const formattedDate = targetDate
    ? new Date(targetDate).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <span
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--brand-primary, #16a34a)' }}
          >
            Nedtelling
          </span>
        </div>

        <div>
          {title && (
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-12">
              {title}
            </h2>
          )}

          {expired ? (
            <p
              className="text-7xl font-black leading-[1.05]"
              style={{ color: 'var(--brand-primary, #16a34a)' }}
            >
              Nådd!
            </p>
          ) : (
            <div className="flex items-center gap-4">
              {timeLeft.map((unit, index) => (
                <div key={unit.label} className="flex items-center gap-4">
                  <TimeBlock value={unit.value} label={unit.label} />
                  {index < timeLeft.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-base text-white/40 font-medium">
          {formattedDate}
        </p>
      </div>
    </div>
  )
}
