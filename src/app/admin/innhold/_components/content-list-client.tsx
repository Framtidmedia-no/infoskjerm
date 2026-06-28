"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { deleteContent, duplicateContent } from "../actions"
import { toast } from "sonner"
import {
  Newspaper, Trophy, ImageIcon, Globe, Store as StoreIcon, Tag,
  Copy, Trash2, Pencil, MoreVertical, Calendar, Search, ChevronLeft, ChevronRight, Monitor,
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
  target: { mode: "all" | "stores" | "tags" | "none"; count: number; names: string[] }
  storeIds: string[]
  tagIds: string[]
}

interface Option { id: string; name: string }

const TYPE_META: Record<string, { label: string; icon: React.ElementType; badge: string; gradient: string }> = {
  news: { label: "Nyhet", icon: Newspaper, badge: "bg-blue-600 text-white", gradient: "from-blue-500 to-blue-700" },
  competition: { label: "Konkurranse", icon: Trophy, badge: "bg-amber-500 text-white", gradient: "from-amber-400 to-amber-600" },
  slide: { label: "Tilbud", icon: ImageIcon, badge: "bg-zinc-700 text-white", gradient: "from-zinc-600 to-zinc-800" },
  stats: { label: "Salgstall", icon: ImageIcon, badge: "bg-emerald-600 text-white", gradient: "from-emerald-500 to-emerald-700" },
  weather: { label: "Vær", icon: ImageIcon, badge: "bg-sky-500 text-white", gradient: "from-sky-400 to-sky-600" },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: "Utkast", color: "bg-white/90 text-zinc-600 ring-1 ring-zinc-200" },
  live: { label: "Publisert", color: "bg-emerald-500 text-white" },
  scheduled: { label: "Planlagt", color: "bg-cyan-500 text-white" },
  archived: { label: "Arkivert", color: "bg-zinc-400 text-white" },
}

function targetIcon(mode: ContentRow["target"]["mode"]) {
  if (mode === "tags") return Tag
  if (mode === "stores") return StoreIcon
  return Globe
}

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const fmt = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  if (from) return `Fra ${fmt(from)}`
  return `Til ${fmt(to!)}`
}

const PAGE_SIZE = 12

const selectCls = "text-xs bg-white border border-zinc-200 rounded-lg px-2.5 py-2 text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-300"

export function ContentListClient({ items, stores, tags, previewUrl }: { items: ContentRow[]; stores: Option[]; tags: Option[]; previewUrl: string | null }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const [search, setSearch] = useState("")
  const [statusF, setStatusF] = useState("all")
  const [storeF, setStoreF] = useState("")
  const [tagF, setTagF] = useState("")
  const [page, setPage] = useState(0)

  function closeMenu() { setMenuId(null); setConfirmId(null) }

  async function handleDuplicate(id: string) {
    setBusyId(id); closeMenu()
    const res = await duplicateContent(id)
    setBusyId(null)
    if (res.ok) { toast.success("Kopiert"); router.refresh() } else toast.error(res.error ?? "Feil")
  }

  async function handleDelete(id: string) {
    setBusyId(id); closeMenu()
    const res = await deleteContent(id)
    setBusyId(null)
    if (res.ok) { toast.success("Slettet"); router.refresh() } else toast.error(res.error ?? "Feil")
  }

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (search && !it.title.toLowerCase().includes(search.toLowerCase())) return false
      if (statusF !== "all" && (it.status ?? "draft") !== statusF) return false
      if (storeF && !it.storeIds.includes(storeF)) return false
      if (tagF && !it.tagIds.includes(tagF)) return false
      return true
    })
  }, [items, search, statusF, storeF, tagF])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const visible = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => { setter(v); setPage(0) }
  }

  const hasFilters = search || statusF !== "all" || storeF || tagF

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Søk i tittel..."
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            className="w-full text-sm bg-white border border-zinc-200 rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-zinc-300"
          />
        </div>
        <select value={statusF} onChange={(e) => resetPage(setStatusF)(e.target.value)} className={selectCls}>
          <option value="all">Alle statuser</option>
          <option value="live">Publisert</option>
          <option value="draft">Utkast</option>
          <option value="scheduled">Planlagt</option>
          <option value="archived">Arkivert</option>
        </select>
        <select value={storeF} onChange={(e) => resetPage(setStoreF)(e.target.value)} className={selectCls}>
          <option value="">Alle butikker</option>
          {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={tagF} onChange={(e) => resetPage(setTagF)(e.target.value)} className={selectCls}>
          <option value="">Alle tagger</option>
          {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {hasFilters && (
          <button onClick={() => { setSearch(""); setStatusF("all"); setStoreF(""); setTagF(""); setPage(0) }} className="text-xs text-zinc-400 hover:text-zinc-700 px-2">Nullstill</button>
        )}
      </div>

      <p className="text-xs text-zinc-400">{filtered.length} {filtered.length === 1 ? "treff" : "treff"}</p>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Newspaper className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">{hasFilters ? "Ingen treff" : "Ingen innhold ennå"}</p>
          {!hasFilters && (
            <Link href="/admin/innhold/ny" className="inline-block mt-4 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>+ Nytt innhold</Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((item) => {
            const tm = TYPE_META[item.type] ?? TYPE_META.slide
            const sm = STATUS_META[item.status ?? "draft"] ?? STATUS_META.draft
            const TypeIcon = tm.icon
            const TargetIcon = targetIcon(item.target.mode)
            const period = formatPeriod(item.validFrom, item.validTo)
            const targetText = item.target.mode === "all" ? "Alle butikker"
              : item.target.mode === "none" ? "Ikke målrettet"
              : item.target.names.slice(0, 2).join(", ") + (item.target.names.length > 2 ? ` +${item.target.names.length - 2}` : "")
            return (
              <div key={item.id} className={`group relative rounded-2xl bg-white border border-zinc-200 overflow-hidden hover:shadow-lg hover:border-zinc-300 transition-all ${busyId === item.id ? "opacity-50" : ""}`}>
                <Link href={`/admin/innhold/${item.id}`} className="block relative aspect-[16/9] overflow-hidden">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${tm.gradient} flex items-center justify-center`}>
                      <TypeIcon className="w-10 h-10 text-white/40" />
                    </div>
                  )}
                  <span className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${tm.badge} shadow-sm`}>
                    <TypeIcon className="w-3 h-3" /> {tm.label}
                  </span>
                  <span className={`absolute top-2.5 right-2.5 text-[10px] font-semibold px-2 py-1 rounded-full ${sm.color} shadow-sm`}>{sm.label}</span>
                </Link>

                <div className="p-3.5">
                  <Link href={`/admin/innhold/${item.id}`}>
                    <h3 className="text-sm font-semibold text-zinc-900 line-clamp-2 leading-snug hover:text-zinc-600">{item.title || "Uten tittel"}</h3>
                  </Link>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                    <span className="flex items-center gap-1 min-w-0"><TargetIcon className="w-3 h-3 flex-shrink-0" /><span className="truncate">{targetText}</span></span>
                    {period && <span className="flex items-center gap-1 flex-shrink-0"><Calendar className="w-3 h-3" />{period}</span>}
                  </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5">
                  <button onClick={() => setMenuId(menuId === item.id ? null : item.id)} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 bg-white/80 hover:bg-zinc-100 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuId === item.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={closeMenu} />
                      <div className="absolute right-0 bottom-9 z-20 w-44 rounded-xl border border-zinc-200 bg-white shadow-lg py-1">
                        <Link href={`/admin/innhold/${item.id}`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Pencil className="w-3.5 h-3.5" /> Rediger</Link>
                        {item.status === "live" && previewUrl && (
                          <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Monitor className="w-3.5 h-3.5" /> Se på skjerm</a>
                        )}
                        <button onClick={() => handleDuplicate(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"><Copy className="w-3.5 h-3.5" /> Dupliser</button>
                        {confirmId === item.id ? (
                          <button onClick={() => handleDelete(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700"><Trash2 className="w-3.5 h-3.5" /> Bekreft sletting</button>
                        ) : (
                          <button onClick={() => setConfirmId(item.id)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Slett</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={current === 0} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-zinc-500">Side {current + 1} av {pageCount}</span>
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={current >= pageCount - 1} className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
