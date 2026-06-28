"use client"
import { useState, useEffect, useRef } from "react"

interface Props { fields: Record<string, unknown> }

function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [current, setCurrent] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    startRef.current = null
    function animate(ts: number) {
      if (!startRef.current) startRef.current = ts
      const p = Math.min((ts - startRef.current) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setCurrent(Math.round(eased * target))
      if (p < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return <span className="tabular-nums">{current.toLocaleString("nb-NO")}</span>
}

interface LiveData {
  actual?: number
  target?: number
  period?: string
  trend_percent?: number
}

export function SalesStatsModule({ fields }: Props) {
  const title = (fields.title as string) || "Omsetning"
  const dataSourceUrl = fields.data_source_url as string | null ?? null
  const refreshSeconds = Number(fields.refresh_interval ?? 30)

  const [liveData, setLiveData] = useState<LiveData | null>(null)

  useEffect(() => {
    if (!dataSourceUrl) return
    const proxyUrl = `/api/data-source?url=${encodeURIComponent(dataSourceUrl)}`
    async function fetchLive() {
      try {
        const res = await fetch(proxyUrl, { cache: "no-store" })
        if (res.ok) setLiveData(await res.json())
      } catch { /* silent */ }
    }
    fetchLive()
    const t = setInterval(fetchLive, refreshSeconds * 1000)
    return () => clearInterval(t)
  }, [dataSourceUrl, refreshSeconds])

  const period = liveData?.period ?? (fields.period as string) ?? "I dag"
  const actual = liveData?.actual ?? Number(fields.actual) ?? 0
  const target = liveData?.target ?? Number(fields.target) ?? 0
  const trendPercent = liveData?.trend_percent ?? Number(fields.trend_percent) ?? 0
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0
  const pctRounded = Math.round(target > 0 ? (actual / target) * 100 : 100)
  const aboveTarget = pctRounded >= 100
  const accent = aboveTarget ? '#22c55e' : pctRounded >= 80 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #070f0a 0%, #0d1a10 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: accent }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] mb-2" style={{ color: accent }}>
            {title}
          </p>
          <p className="text-base text-white/40 uppercase tracking-widest font-medium">{period}</p>
        </div>

        <div>
          <p className="text-[10rem] font-black leading-none tabular-nums text-white">
            <AnimatedNumber target={actual} />
          </p>
          <p className="text-2xl text-white/40 mt-2 font-medium">kr</p>
        </div>

        <div className="space-y-4">
          {target > 0 && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50 font-medium">Mål: {target.toLocaleString("nb-NO")} kr</span>
                <span className="font-black text-2xl" style={{ color: accent }}>{pctRounded}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: accent,
                    transitionDuration: "1200ms",
                    transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </>
          )}
          {trendPercent !== 0 && (
            <p className="text-xl font-bold" style={{ color: accent }}>
              {trendPercent >= 0 ? "↑" : "↓"} {Math.abs(trendPercent)}% vs. i går
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
