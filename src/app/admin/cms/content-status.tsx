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

const CARD = "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition-all hover:shadow-sm"

export function ContentStatus({ counts }: { counts: ContentStatusCounts }) {
  const items = [
    { key: "live", label: "Live nå", value: counts.live, icon: Radio, cls: "border-emerald-200", iconCls: "text-emerald-600 bg-emerald-50" },
    { key: "soon", label: "Utløper denne uka", value: counts.expiringSoon, icon: CalendarClock, cls: counts.expiringSoon > 0 ? "border-amber-200" : "border-zinc-200", iconCls: "text-amber-600 bg-amber-50" },
    { key: "drafts", label: "Utkast", value: counts.drafts, icon: FileText, cls: "border-zinc-200", iconCls: "text-zinc-500 bg-zinc-100" },
    { key: "expired", label: "Utløpt – ennå live", value: counts.expired, icon: AlertTriangle, cls: counts.expired > 0 ? "border-red-200" : "border-zinc-200", iconCls: counts.expired > 0 ? "text-red-600 bg-red-50" : "text-zinc-400 bg-zinc-100" },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map(({ key, label, value, icon: Icon, cls, iconCls }) => (
        <Link key={key} href="/admin/innhold" className={`${CARD} ${cls}`}>
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconCls}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xl font-bold leading-none text-zinc-900">{value}</span>
            <span className="block text-[11px] text-zinc-500 mt-1 truncate">{label}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
