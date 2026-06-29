import { fetchLiveContent } from "@/lib/content/live"

/**
 * Public ticker widget embedded into the Xibo layouts as a webpage.
 * Driven by the CMS: shows published "ticker"-type messages for the store as a
 * scrolling strip with a pulsing red indicator. When there are NO active ticker
 * messages it renders a transparent, empty page so the strip disappears.
 *
 * Usage: /widget/ticker?store=<storeId>   (omit store = all-stores feed)
 */

export const dynamic = "force-dynamic"

export default async function TickerWidgetPage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const items = await fetchLiveContent(store ?? null, ["ticker"])
  const messages = items.map((i) => i.title.trim()).filter(Boolean)

  // No active ticker → transparent empty page (strip hidden on screen).
  if (messages.length === 0) {
    return <main style={{ margin: 0, height: "100vh", width: "100%", background: "transparent" }} />
  }

  const line = messages.join("    ·    ")

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
          70%  { box-shadow: 0 0 0 18px rgba(255,255,255,0); }
          100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
        }
        @keyframes gr-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .gr-dot { width: 15px; height: 15px; border-radius: 9999px; background: #ef4444; flex: 0 0 auto; animation: gr-pulse 1.4s ease-out infinite; }
        .gr-tag { display: flex; align-items: center; gap: 12px; padding: 0 28px; height: 100%; flex: 0 0 auto; background: #16a34a; z-index: 2; font-weight: 900; font-size: 26px; letter-spacing: 3px; }
        .gr-track { flex: 1 1 auto; overflow: hidden; position: relative; height: 100%; }
        .gr-move { position: absolute; top: 0; left: 0; height: 100%; display: flex; align-items: center; white-space: nowrap; font-size: 30px; font-weight: 600; animation: gr-scroll 30s linear infinite; will-change: transform; }
        .gr-seg { padding-right: 80px; }
      `}</style>

      <div className="gr-tag">
        <span className="gr-dot" />
        <span>NYTT</span>
      </div>
      <div className="gr-track">
        <div className="gr-move">
          <span className="gr-seg">{line}</span>
          <span className="gr-seg">{line}</span>
        </div>
      </div>
    </main>
  )
}
