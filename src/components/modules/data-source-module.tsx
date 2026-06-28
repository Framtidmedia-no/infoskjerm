"use client"

import { useEffect, useState } from "react"

interface DataPayload {
  value: number | string
  label?: string
  unit?: string
  trend?: number
}

interface DataSourceModuleProps {
  fields: Record<string, unknown>
}

export function DataSourceModule({ fields }: DataSourceModuleProps) {
  const sourceUrl = fields.source_url as string | null
  const refreshSeconds = Number(fields.refresh_interval ?? 30)
  const displayLabel = fields.label as string | null
  const unit = fields.unit as string | null

  const [data, setData] = useState<DataPayload | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!sourceUrl) return

    const proxyUrl = `/api/data-source?url=${encodeURIComponent(sourceUrl)}`

    async function fetchData() {
      try {
        const res = await fetch(proxyUrl, { cache: "no-store" })
        if (!res.ok) throw new Error("fetch failed")
        const json = await res.json() as DataPayload
        setData(json)
        setError(false)
      } catch {
        setError(true)
      }
    }

    fetchData()
    const timer = setInterval(fetchData, refreshSeconds * 1000)
    return () => clearInterval(timer)
  }, [sourceUrl, refreshSeconds])

  if (!sourceUrl) {
    return (
      <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
        <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />
        <div className="flex flex-col justify-between flex-1 px-16 py-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
            Datakilde
          </p>
          <div className="flex flex-col gap-8">
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
              Ingen kilde konfigurert
            </h2>
            <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
              Angi en kilde-URL i builder-feltet for å hente og vise data.
            </p>
          </div>
          <p className="text-base text-white/40 font-medium">
            Oppdateres hvert {refreshSeconds}s
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
        <div className="h-2 w-full" style={{ backgroundColor: '#dc2626' }} />
        <div className="flex flex-col justify-between flex-1 px-16 py-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-500">
            Feil
          </p>
          <div className="flex flex-col gap-8">
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
              Klarte ikke hente data
            </h2>
            <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
              Sjekk at kilde-URL er tilgjengelig og returnerer gyldig JSON.
            </p>
          </div>
          <p className="text-base text-white/40 font-medium">
            Prøver igjen hvert {refreshSeconds}s
          </p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
        <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />
        <div className="flex flex-col justify-center items-center flex-1">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: 'var(--brand-primary, #16a34a)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    )
  }

  const trend = data.trend
  const trendPositive = trend !== undefined && trend > 0
  const trendNegative = trend !== undefined && trend < 0

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
          {data.label ?? displayLabel ?? "Verdi"}
        </p>

        <div className="flex flex-col gap-6">
          <div className="flex items-end gap-4">
            <span className="text-7xl font-black leading-[1.05] text-white tabular-nums">
              {data.value}
            </span>
            {(data.unit ?? unit) && (
              <span className="text-3xl text-white/40 font-medium mb-2">{data.unit ?? unit}</span>
            )}
          </div>

          {trend !== undefined && (
            <p className={`text-2xl leading-relaxed font-bold ${trendPositive ? 'text-green-400' : trendNegative ? 'text-red-400' : 'text-white/40'}`}>
              {trendPositive ? '+' : ''}{trend}% vs forrige periode
            </p>
          )}
        </div>

        <p className="text-base text-white/40 font-medium">
          Oppdateres hvert {refreshSeconds}s
        </p>
      </div>
    </div>
  )
}
