"use client"

import React, { useState } from "react"
import { Search, Pencil, Eye, BarChart3, CloudSun, Image as ImageIcon, Trophy, Newspaper, Layers, Clock, User, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ContentDeleteButton } from "./content-delete-button"
import { ContentDuplicateButton } from "./content-duplicate-button"
import { ContentApproveButton } from "./content-approve-button"
import { ContentRejectButton } from "./content-reject-button"

export interface ContentListItem {
  id: string
  title: string
  status: string | null
  author: string
  created: string
  validTo: string | null
  validFrom: string | null
  type: string
  showApprove?: boolean
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
  approved: { label: "Publisert", variant: "success" },
  live: { label: "Live", variant: "success" },
  pending_approval: { label: "Venter godkjenning", variant: "warning" },
  draft: { label: "Utkast", variant: "secondary" },
  rejected: { label: "Avvist", variant: "destructive" },
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  news: Newspaper,
  competition: Trophy,
  slide: Layers,
  stats: BarChart3,
  weather: CloudSun,
}

interface Props {
  items: ContentListItem[]
  emptyMessage?: string
  createHref?: string
  createLabel?: string
}

export function ContentItemListClient({ items, emptyMessage = "Ingen elementer funnet.", createHref, createLabel }: Props) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? items.filter(item => item.title.toLowerCase().includes(query.toLowerCase()))
    : items

  return (
    <div className="space-y-3">
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            aria-label="Tøm søk"
          >
            ×
          </button>
        )}
      </div>

      {query && (
        <p className="text-xs text-zinc-400">{filtered.length} av {items.length} resultater</p>
      )}

      {filtered.length === 0 ? (
        query ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-zinc-400 text-sm">Ingen treff på &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 bg-white border border-zinc-100 rounded-xl text-center">
            <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-zinc-700 text-sm font-medium mb-1">{emptyMessage}</p>
            <p className="text-zinc-400 text-xs mb-4">Trykk på knappen øverst for å opprette ditt første element.</p>
            {createHref && (
              <Button size="sm" asChild>
                <Link href={createHref} className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  {createLabel ?? "Opprett nytt"}
                </Link>
              </Button>
            )}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const statusCfg = STATUS_CONFIG[item.status ?? "draft"] ?? STATUS_CONFIG.draft
            const IconComp = TYPE_ICONS[item.type] ?? ImageIcon

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <IconComp className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-zinc-900 text-sm">{item.title}</p>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <User className="w-3 h-3" />{item.author}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" />{item.created}
                        </span>
                        {item.validFrom && item.validTo && (
                          <span className="text-xs text-zinc-400">{item.validFrom} – {item.validTo}</span>
                        )}
                        {item.validTo && !item.validFrom && (
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
                        <Link href={`/preview/${item.id}`} target="_blank">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/admin/builder?id=${item.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <ContentDuplicateButton itemId={item.id} />
                      <ContentDeleteButton itemId={item.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
