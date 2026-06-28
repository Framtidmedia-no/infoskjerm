"use client"

import { useState } from "react"
import { Search, Plus, BarChart3, CloudSun, Image as ImageIcon, Trophy, Newspaper, Layers, Clock, User, Pencil, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ContentDeleteButton } from "./content-delete-button"
import { ContentDuplicateButton } from "./content-duplicate-button"
import { ContentApproveButton } from "./content-approve-button"
import { ContentRejectButton } from "./content-reject-button"
import type { ContentListItem } from "./content-item-list-client"

const TABS = [
  { key: "all", label: "Alle" },
  { key: "news", label: "Nyheter" },
  { key: "competition", label: "Konkurranser" },
  { key: "stats", label: "Salgstall" },
  { key: "weather", label: "Vær" },
  { key: "slide", label: "Slides" },
]

const CREATE_HREFS: Record<string, string> = {
  all: "/admin/content/new",
  news: "/admin/content/new?type=news",
  competition: "/admin/content/new?type=competition",
  stats: "/admin/content/new?type=stats",
  weather: "/admin/content/new?type=weather",
  slide: "/admin/content/new?type=slide",
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  approved: { label: "Publisert", variant: "success" },
  live: { label: "Live", variant: "success" },
  pending_approval: { label: "Venter godkjenning", variant: "warning" },
  draft: { label: "Utkast", variant: "secondary" },
  rejected: { label: "Avvist", variant: "destructive" },
  scheduled: { label: "Planlagt", variant: "outline" },
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  news: Newspaper,
  competition: Trophy,
  slide: Layers,
  stats: BarChart3,
  weather: CloudSun,
}

const TYPE_LABELS: Record<string, string> = {
  news: "Nyhet",
  competition: "Konkurranse",
  stats: "Salgstall",
  weather: "Vær",
  slide: "Slide",
}

const TYPE_COLORS: Record<string, string> = {
  news: "bg-blue-100 text-blue-700",
  competition: "bg-amber-100 text-amber-700",
  stats: "bg-emerald-100 text-emerald-700",
  weather: "bg-sky-100 text-sky-700",
  slide: "bg-zinc-100 text-zinc-700",
}

interface Props {
  items: ContentListItem[]
}

export function AllContentClient({ items }: Props) {
  const [activeTab, setActiveTab] = useState("all")
  const [query, setQuery] = useState("")

  const tabFiltered = activeTab === "all" ? items : items.filter(i => i.type === activeTab)
  const filtered = query.trim()
    ? tabFiltered.filter(i => i.title.toLowerCase().includes(query.toLowerCase()))
    : tabFiltered

  const tabCounts = TABS.reduce((acc, tab) => {
    acc[tab.key] = tab.key === "all" ? items.length : items.filter(i => i.type === tab.key).length
    return acc
  }, {} as Record<string, number>)

  const createHref = CREATE_HREFS[activeTab] ?? "/admin/content/new"

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "text-white"
                : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
            }`}
            style={activeTab === tab.key ? { backgroundColor: "var(--brand-primary)" } : undefined}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${
                activeTab === tab.key ? "bg-white/20" : "bg-zinc-100 text-zinc-500"
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Søk på tittel..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {query && (
        <p className="text-xs text-zinc-400">{filtered.length} av {tabFiltered.length} resultater</p>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-white border border-zinc-100 rounded-xl text-center">
          <div className="w-14 h-14 bg-zinc-50 rounded-2xl flex items-center justify-center mb-4">
            <Plus className="w-7 h-7 text-zinc-300" />
          </div>
          <p className="text-zinc-700 text-sm font-semibold mb-1">
            {query ? `Ingen treff på "${query}"` : "Ingen innhold her ennå"}
          </p>
          {!query && (
            <>
              <p className="text-zinc-400 text-sm mb-5 max-w-xs">
                Opprett ditt første innholdselement og publiser det til skjermene dine.
              </p>
              <Button size="sm" asChild>
                <Link href={createHref} className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Opprett nytt innhold
                </Link>
              </Button>
            </>
          )}
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.map(item => {
          const statusCfg = STATUS_CONFIG[item.status ?? "draft"] ?? STATUS_CONFIG.draft
          const IconComp = TYPE_ICONS[item.type] ?? ImageIcon

          return (
            <div key={item.id} className="flex items-center gap-4 bg-white border border-zinc-100 rounded-xl p-4 hover:border-zinc-200 hover:shadow-sm transition-all">
              <div className="w-9 h-9 rounded-lg bg-zinc-50 flex items-center justify-center flex-shrink-0">
                <IconComp className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-zinc-900 text-sm">{item.title}</p>
                  <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  {activeTab === "all" && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[item.type] ?? "bg-zinc-100 text-zinc-600"}`}>
                      {TYPE_LABELS[item.type] ?? item.type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <User className="w-3 h-3" />{item.author}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-zinc-400">
                    <Clock className="w-3 h-3" />{item.created}
                  </span>
                  {item.validTo && (
                    <span className="text-xs text-zinc-400">Utløper {item.validTo}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {item.showApprove && item.status === "pending_approval" && (
                  <>
                    <ContentApproveButton itemId={item.id} />
                    <ContentRejectButton itemId={item.id} />
                  </>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href={`/preview/${item.id}`} target="_blank" title="Forhåndsvisning">
                    <Eye className="w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href={`/admin/builder?id=${item.id}`} title="Rediger">
                    <Pencil className="w-4 h-4" />
                  </Link>
                </Button>
                <ContentDuplicateButton itemId={item.id} />
                <ContentDeleteButton itemId={item.id} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
