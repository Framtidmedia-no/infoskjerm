import { AlertTriangle, BarChart3, CheckCircle2 } from "lucide-react"
import type { ScreenInsight } from "@/lib/xibo/insight"

/**
 * Estate-wide screen insight at the top of /admin/cms: active player faults and
 * a 7-day proof-of-play summary, read live from the engine. Honest empty states
 * — no Pis connected yet means no faults and no play data, said plainly.
 */

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return h > 0 ? `${h}t ${m}m` : `${m}m`
}

export function InsightPanel({ insight }: { insight: ScreenInsight }) {
  const { faults, topPlays, from, to } = insight
  const maxPlays = topPlays[0]?.plays ?? 0

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Faults */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex items-center gap-2 px-4 py-2.5 border-b border-zinc-100">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-semibold text-zinc-700">Skjermfeil</h2>
        </header>
        {faults.length === 0 ? (
          <p className="flex items-center gap-2 px-4 py-3 text-xs text-zinc-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Ingen feil meldt fra skjermene.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {faults.slice(0, 6).map((f, i) => (
              <li key={i} className="px-4 py-2.5">
                <p className="text-sm text-zinc-800">{f.display ?? "Ukjent skjerm"}</p>
                <p className="text-xs text-red-600">{f.description}{f.since ? ` · ${f.since}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Proof of play */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-zinc-500" />
            <h2 className="text-xs font-semibold text-zinc-700">Mest vist</h2>
          </div>
          <span className="text-[11px] text-zinc-400">{from} – {to}</span>
        </header>
        {topPlays.length === 0 ? (
          <p className="px-4 py-3 text-xs text-zinc-500">
            Ingen avspillingsdata ennå — fylles når skjermer er tilkoblet og har vist innhold.
          </p>
        ) : (
          <ul className="px-4 py-2 space-y-1.5">
            {topPlays.map((row) => (
              <li key={row.layout} className="flex items-center gap-2">
                <span className="text-xs text-zinc-600 truncate w-40 shrink-0" title={row.layout}>{row.layout}</span>
                <span className="relative flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${maxPlays > 0 ? Math.max(4, (row.plays / maxPlays) * 100) : 0}%`, backgroundColor: "var(--brand-primary)" }}
                  />
                </span>
                <span className="text-[11px] text-zinc-500 tabular-nums w-24 text-right shrink-0">
                  {row.plays} visn · {fmtDuration(row.durationSec)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
