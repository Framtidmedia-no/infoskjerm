"use client"

import { useEffect, useRef } from "react"

interface PowerBIModuleProps {
  fields: Record<string, unknown>
}

export function PowerBIModule({ fields }: PowerBIModuleProps) {
  const embedUrl = fields.embed_url as string | null
  const refreshInterval = Number(fields.refresh_interval ?? 300)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!embedUrl || refreshInterval <= 0) return
    const timer = setInterval(() => {
      if (iframeRef.current) {
        iframeRef.current.src = embedUrl
      }
    }, refreshInterval * 1000)
    return () => clearInterval(timer)
  }, [embedUrl, refreshInterval])

  if (!embedUrl) {
    return (
      <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
        <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

        <div className="flex flex-col justify-between flex-1 px-16 py-12">
          <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
            Power BI
          </p>

          <div className="flex flex-col gap-8">
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
              Ingen rapport konfigurert
            </h2>
            <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
              Lim inn en Power BI «Publish to web»-URL i builder-feltet for å vise rapporten.
            </p>
          </div>

          <p className="text-base text-white/40 font-medium">
            Power BI rapport · Oppdateres hvert {refreshInterval}s
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />
      <iframe
        ref={iframeRef}
        src={embedUrl}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        allowFullScreen
        title="Power BI rapport"
      />
    </div>
  )
}
