import { fetchAllStoresKpi, kr, pct, diffPct, type StoreKpiRow } from "@/lib/content/kpi"

/**
 * Staff/HQ overview: all stores' key figures side by side, ranked by performance
 * vs budget. Operational/confidential — staff & management screens only.
 *
 * Usage: /widget/kpi-oversikt
 */

export const dynamic = "force-dynamic"

const GREEN = "#16a34a"
const RED = "#ef4444"
const MUTED = "rgba(255,255,255,.5)"

function Delta({ value, digits = 1 }: { value: number | null; digits?: number }) {
  if (value === null) return <span style={{ color: MUTED }}>–</span>
  const up = value >= 0
  return (
    <span style={{ color: up ? GREEN : RED, fontWeight: 800 }}>
      {up ? "▲" : "▼"} {Math.abs(value).toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })} %
    </span>
  )
}

function HeadCell({ children, width }: { children: React.ReactNode; width: number }) {
  return <div style={{ width, flex: width ? "0 0 auto" : "1 1 auto", textAlign: "right", fontSize: 18, letterSpacing: 1, textTransform: "uppercase", color: MUTED }}>{children}</div>
}

function Row({ row, rank }: { row: StoreKpiRow; rank: number }) {
  const dBud = diffPct(row.omsetning, row.budsjett)
  const dFjor = diffPct(row.omsetning, row.fjor)
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 22px", height: 58, borderRadius: 14, background: rank % 2 ? "transparent" : "rgba(255,255,255,.035)" }}>
      <div style={{ width: 44, flex: "0 0 auto", fontSize: 26, fontWeight: 800, color: MUTED, textAlign: "center" }}>{medal ?? rank}</div>
      <div style={{ flex: "1 1 auto", minWidth: 0, fontSize: 26, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.storeName}</div>
      <div style={{ width: 230, flex: "0 0 auto", textAlign: "right", fontSize: 28, fontWeight: 900 }}>{kr(row.omsetning)} <span style={{ fontSize: 18, color: MUTED }}>kr</span></div>
      <div style={{ width: 150, flex: "0 0 auto", textAlign: "right", fontSize: 24 }}><Delta value={dBud} /></div>
      <div style={{ width: 150, flex: "0 0 auto", textAlign: "right", fontSize: 24 }}><Delta value={dFjor} /></div>
      <div style={{ width: 130, flex: "0 0 auto", textAlign: "right", fontSize: 24, fontWeight: 700 }}>{pct(row.bruttoPct)}</div>
      <div style={{ width: 130, flex: "0 0 auto", textAlign: "right", fontSize: 24, fontWeight: 700 }}>{pct(row.lonnPct)}</div>
      <div style={{ width: 130, flex: "0 0 auto", textAlign: "right", fontSize: 24, fontWeight: 700 }}>{pct(row.svinnPct)}</div>
    </div>
  )
}

export default async function KpiOverviewPage() {
  const data = await fetchAllStoresKpi()

  const frame: React.CSSProperties = {
    margin: 0,
    width: "100%",
    height: "100vh",
    boxSizing: "border-box",
    padding: "48px 56px",
    background: "linear-gradient(135deg,#0a0a0a,#141414)",
    color: "#fff",
    fontFamily: "Arial, Helvetica, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 22,
    overflow: "hidden",
  }

  if (!data) {
    return (
      <main style={{ ...frame, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: MUTED, fontSize: 40 }}>Ingen driftstall tilgjengelig</div>
      </main>
    )
  }

  const t = data.total
  return (
    <main style={frame}>
      {/* Header + chain total */}
      <header style={{ display: "flex", alignItems: "flex-end", gap: 28 }}>
        <div>
          <div style={{ fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: GREEN, fontWeight: 800 }}>Gange-Rolv · alle butikker</div>
          <h1 style={{ fontSize: 46, fontWeight: 900, margin: "4px 0 0" }}>Uke {data.latestWeek} · {data.year}</h1>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: 20, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>Total omsetning · siste uke</div>
          <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1 }}>{kr(t.omsetning)} <span style={{ fontSize: 26, color: MUTED }}>kr</span></div>
          <div style={{ fontSize: 24, marginTop: 4 }}>
            <span style={{ color: MUTED }}>vs budsjett </span><Delta value={diffPct(t.omsetning, t.budsjett)} />
            <span style={{ color: MUTED }}>  ·  vs i fjor </span><Delta value={diffPct(t.omsetning, t.fjor)} />
          </div>
        </div>
      </header>

      {/* Column header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "0 22px" }}>
        <div style={{ width: 44, flex: "0 0 auto" }} />
        <div style={{ flex: "1 1 auto", fontSize: 18, letterSpacing: 1, textTransform: "uppercase", color: MUTED }}>Butikk</div>
        <HeadCell width={230}>Omsetning</HeadCell>
        <HeadCell width={150}>vs bud.</HeadCell>
        <HeadCell width={150}>vs fjor</HeadCell>
        <HeadCell width={130}>Brutto</HeadCell>
        <HeadCell width={130}>Lønn</HeadCell>
        <HeadCell width={130}>Svinn</HeadCell>
      </div>

      {/* Store rows */}
      <section style={{ flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 2, justifyContent: "space-between" }}>
        {data.stores.map((row, i) => (
          <Row key={row.storeName} row={row} rank={i + 1} />
        ))}
      </section>

      {/* YTD footer */}
      <footer style={{ display: "flex", gap: 40, alignItems: "center", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 18, flex: "0 0 auto" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: MUTED }}>Hittil i år · kjeden</span>
        <span style={{ fontSize: 38, fontWeight: 900 }}>{kr(t.ytdOmsetning)} kr</span>
        <span style={{ fontSize: 26, color: MUTED }}>vs budsjett <Delta value={diffPct(t.ytdOmsetning, t.ytdBudsjett)} /></span>
        <span style={{ fontSize: 26, color: MUTED }}>vs i fjor <Delta value={diffPct(t.ytdOmsetning, t.ytdFjor)} /></span>
      </footer>
    </main>
  )
}
