"use client"

interface Props { fields: Record<string, unknown> }

export function NewsTickerModule({ fields }: Props) {
  const title = (fields.title as string) || ""
  const ticker = (fields.ticker_text as string) || ""
  const speed = Number(fields.speed) || 60 // sekunder for ett gjennomløp
  const bgColor = (fields.bg_color as string) || "#1a1a2e"
  const textColor = (fields.text_color as string) || "#ffffff"
  const items = ticker.split("|").map((s) => s.trim()).filter(Boolean)

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: bgColor }}>
      {title && (
        <div className="px-8 pt-8 pb-4">
          <h2 className="text-4xl font-bold" style={{ color: textColor }}>{title}</h2>
        </div>
      )}
      <div className="flex-1 flex items-center overflow-hidden">
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
            <span key={i} className="text-5xl font-bold" style={{ color: textColor }}>
              {item}
              <span className="mx-8 opacity-30">•</span>
            </span>
          )) : (
            <span className="text-5xl font-bold opacity-40" style={{ color: textColor }}>
              Ingen nyhetssaker ennå
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
