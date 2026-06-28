"use client"

interface Props { fields: Record<string, unknown> }

export function NewsTickerModule({ fields }: Props) {
  const title = (fields.title as string) || ""
  const ticker = (fields.ticker_text as string) || ""
  const speed = Number(fields.speed) || 60
  const items = ticker.split("|").map((s) => s.trim()).filter(Boolean)

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        {title && (
          <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
            {title}
          </p>
        )}

        <div className="flex-1 flex flex-col justify-center overflow-hidden">
          <style>{`
            @keyframes ticker-scroll {
              0%   { transform: translateX(100vw); }
              100% { transform: translateX(-100%); }
            }
            .ticker-track {
              display: flex;
              gap: 6rem;
              white-space: nowrap;
              animation: ticker-scroll ${speed}s linear infinite;
              will-change: transform;
            }
          `}</style>
          <div className="ticker-track">
            {items.length > 0 ? items.map((item, i) => (
              <span key={i} className="text-7xl font-black leading-[1.05] text-white">
                {item}
                <span className="mx-12 text-white/20">—</span>
              </span>
            )) : (
              <span className="text-7xl font-black leading-[1.05] text-white/40">
                Ingen nyhetssaker ennå
              </span>
            )}
          </div>
        </div>

        <p className="text-base text-white/40 font-medium">
          {items.length} {items.length === 1 ? 'sak' : 'saker'}
        </p>
      </div>
    </div>
  )
}
