import Link from "next/link"
import { Radio, CalendarClock, FileText, AlertTriangle } from "lucide-react"

/**
 * At-a-glance content health for the CMS landing page: what's live now, what
 * expires this week, drafts waiting, and anything still live past its end date.
 * Counts are computed server-side and link into the content list.
 */

export interface ContentStatusCounts {
  live: number
  expiringSoon: number
  drafts: number
  expired: number
}

const CARD =
  "fx-rise group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border bg-white px-4 py-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(16,24,40,0.22)]"

export function ContentStatus({ counts }: { counts: ContentStatusCounts }) {
  const items = [
    { key: "live", label: "Live nå", value: counts.live, icon: Radio, cls: "border-emerald-200/80", iconCls: "text-emerald-600 bg-emerald-50", glow: "rgba(16,185,129,0.10)" },
    { key: "soon", label: "Utløper denne uka", value: counts.expiringSoon, icon: CalendarClock, cls: counts.expiringSoon > 0 ? "border-amber-200/80" : "border-zinc-200/80", iconCls: "text-amber-600 bg-amber-50", glow: counts.expiringSoon > 0 ? "rgba(245,158,11,0.10)" : null },
    { key: "drafts", label: "Utkast", value: counts.drafts, icon: FileText, cls: "border-zinc-200/80", iconCls: "text-zinc-500 bg-zinc-100", glow: null },
    { key: "expired", label: "Utløpt – ennå live", value: counts.expired, icon: AlertTriangle, cls: counts.expired > 0 ? "border-red-200/80" : "border-zinc-200/80", iconCls: counts.expired > 0 ? "text-red-600 bg-red-50" : "text-zinc-400 bg-zinc-100", glow: counts.expired > 0 ? "rgba(239,68,68,0.10)" : null },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map(({ key, label, value, icon: Icon, cls, iconCls, glow }, i) => (
        <Link key={key} href="/admin/innhold" className={`${CARD} ${cls}`} style={{ animationDelay: `${i * 60}ms` }}>
          {glow && (
            <span
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-20 w-24 rounded-full"
              style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
            />
          )}
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${iconCls}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="font-display block text-2xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums">{value}</span>
            <span className="mt-1 block truncate text-[11px] text-zinc-500">{label}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
