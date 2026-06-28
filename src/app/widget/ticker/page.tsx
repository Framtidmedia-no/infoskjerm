/**
 * Public ticker widget, embedded into the Xibo base template as a webpage.
 * A real news ticker: pulsing red "NYTT" indicator + horizontally scrolling text.
 * Rendered server-side so Xibo never sanitises the CSS animations (unlike the
 * text widget). Usage: /widget/ticker?text=...&label=NYTT
 *
 * Public (middleware only guards /admin); framed only by Xibo (see next.config).
 */

export const dynamic = "force-dynamic"

const DEFAULT_TEXT = "Velkommen til Gange-Rolv · Husk medlemsfordeler i kassen · God handel!"

interface SearchParams {
  text?: string
  label?: string
}

export default async function TickerWidgetPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { text, label } = await searchParams
  const message = text?.trim() || DEFAULT_TEXT
  const tag = label?.trim() || "NYTT"

  return (
    <main
      style={{
        margin: 0,
        height: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        background: "#16a34a",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#fff",
      }}
    >
      <style>{`
        @keyframes gr-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,255,255,.65); }
          70%  { box-shadow: 0 0 0 22px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes gr-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .gr-dot {
          width: 18px; height: 18px; border-radius: 9999px;
          background: #ef4444; flex: 0 0 auto;
          animation: gr-pulse 1.4s ease-out infinite;
        }
        .gr-tag {
          display: flex; align-items: center; gap: 14px;
          padding: 0 32px; height: 100%; flex: 0 0 auto;
          background: #16a34a; z-index: 2;
          font-weight: 900; font-size: 30px; letter-spacing: 3px;
        }
        .gr-track {
          flex: 1 1 auto; overflow: hidden; position: relative; height: 100%;
        }
        .gr-move {
          position: absolute; top: 0; left: 0; height: 100%;
          display: flex; align-items: center; white-space: nowrap;
          font-size: 34px; font-weight: 600;
          animation: gr-scroll 30s linear infinite;
          will-change: transform;
        }
        .gr-seg { padding-right: 80px; }
      `}</style>

      <div className="gr-tag">
        <span className="gr-dot" />
        <span>{tag}</span>
      </div>
      <div className="gr-track">
        {/* Two identical segments so the -50% scroll loops seamlessly. */}
        <div className="gr-move">
          <span className="gr-seg">{message}</span>
          <span className="gr-seg">{message}</span>
        </div>
      </div>
    </main>
  )
}
