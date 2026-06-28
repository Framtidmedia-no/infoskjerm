"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteContent, duplicateContent } from "../actions"
import { toast } from "sonner"
import {
  Newspaper, Trophy, BarChart2, CloudSun, ImageIcon,
  Globe, Store as StoreIcon, Tag, Copy, Trash2, Pencil, MoreVertical, Calendar,
} from "lucide-react"

export interface ContentRow {
  id: string
  title: string
  type: string
  status: string | null
  imageUrl: string | null
  validFrom: string | null
  validTo: string | null
  updatedAt: string | null
  target: { mode: "all" | "stores" | "tags" | "none"; count: number }
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; badge: string; gradient: string }> = {
  news: { label: "Nyhet", icon: Newspaper, badge: "bg-blue-600 text-white", gradient: "from-blue-500 to-blue-700" },
  competition: { label: "Konkurranse", icon: Trophy, badge: "bg-amber-500 text-white", gradient: "from-amber-400 to-amber-600" },
  slide: { label: "Tilbud", icon: ImageIcon, badge: "bg-zinc-700 text-white", gradient: "from-zinc-600 to-zinc-800" },
  stats: { label: "Salgstall", icon: BarChart2, badge: "bg-emerald-600 text-white", gradient: "from-emerald-500 to-emerald-700" },
  weather: { label: "Vær", icon: CloudSun, badge: "bg-sky-500 text-white", gradient: "from-sky-400 to-sky-600" },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "Utkast", color: "bg-white/90 text-zinc-600 ring-1 ring-zinc-200" },
  live: { label: "Publisert", color: "bg-emerald-500 text-white" },
  scheduled: { label: "Planlagt", color: "bg-cyan-500 text-white" },
  archived: { label: "Arkivert", color: "bg-zinc-400 text-white" },
}

function targetLabel(t: ContentRow["target"]) {
  if (t.mode === "all") return { icon: Globe, text: "Alle butikker" }
  if (t.mode === "stores") return { icon: StoreIcon, text: `${t.count} butikk${t.count === 1 ? "" : "er"}` }
  if (t.mode === "tags") return { icon: Tag, text: `${t.count} tagg${t.count === 1 ? "" : "er"}` }
  return { icon: Globe, text: "Ikke målrettet" }
}

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const fmt = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  if (from) return `Fra ${fmt(from)}`
  return `Til ${fmt(to!)}`
}

export function ContentListClient({ items }: { items: ContentRow[] }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)

  async function handleDuplicate(id: string) {
    setBusyId(id); setMenuId(null)
    const res = await duplicateContent(id)
    setBusyId(null)
    if (res.ok) { toast.success("Kopiert"); router.refresh() } else toast.error(res.error ?? "Feil")
  }

  async function handleDelete(id: string) {
    if (!confirm("Slette dette innholdet?")) return
    setBusyId(id); setMenuId(null)
    const res = await deleteContent(id)
    setBusyId(null)
    if (res.ok) { toast.success("Slettet"); router.refresh() } else toast.error(res.error ?? "Feil")
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
        <Newspaper className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-zinc-700">Ingen innhold ennå</p>
        <p className="text-xs text-zinc-400 mt-1">Lag din første nyhet, tilbud eller konkurranse.</p>
        <Link href="/admin/innhold/ny" className="inline-block mt-4 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>
          + Nytt innhold
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {items.map((item) => {
        const tm = TYPE_META[item.type] ?? TYPE_META.slide
        const sm = STATUS_META[item.status ?? "draft"] ?? STATUS_META.draft
        const tl = targetLabel(item.target)
        const TypeIcon = tm.icon
        const TargetIcon = tl.icon
        const period = formatPeriod(item.validFrom, item.validTo)
        return (
          <div key={item.id} className={`group relative rounded-2xl bg-white border border-zinc-200 overflow-hidden hover:shadow-lg hover:border-zinc-300 transition-all ${busyId === item.id ? "opacity-50" : ""}`}>
            {/* Media */}
            <Link href={`/admin/innhold/${item.id}`} className="block relative aspect-[16/9] overflow-hidden">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${tm.gradient} flex items-center justify-center`}>
                  <TypeIcon className="w-10 h-10 text-white/40" />
                </div>
              )}
              {/* Type badge */}
              <span className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${tm.badge} shadow-sm`}>
                <TypeIcon className="w-3 h-3" /> {tm.label}
              </span>
              {/* Status badge */}
              <span className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-1 rounded-full ${sm.color} shadow-sm`}>{sm.label}</span>
            </Link>

            {/* Body */}
            <div className="p-3.5">
              <Link href={`/admin/innhold/${item.id}`}>
                <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug hover:text-zinc-600">{item.title || "Uten tittel"}</h3>
              </Link>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><TargetIcon className="w-3 h-3" />{tl.text}</span>
                {period && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{period}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="absolute bottom-2.5 right-2.5">
              <button onClick={() => setMenuId(menuId === item.id ? null : item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 bg-white/80 hover:bg-zinc-100 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuId === item.id && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                  <div className="absolute right-0 bottom-9 z-20 w-40 rounded-xl border border-zinc-200 bg-white shadow-lg py-1">
                    <Link href={`/admin/innhold/${item.id}`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Pencil className="w-3.5 h-3.5" /> Rediger</Link>
                    <button onClick={() => handleDuplicate(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Copy className="w-3.5 h-3.5" /> Dupliser</button>
                    <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Slett</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
