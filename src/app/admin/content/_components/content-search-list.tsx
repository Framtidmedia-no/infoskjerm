"use client"

import { useState } from "react"
import { Search } from "lucide-react"

interface ContentItem {
  id: string
  title: string
  status: string | null
  [key: string]: unknown
}

interface ContentSearchListProps {
  items: ContentItem[]
  renderItem: (item: ContentItem) => React.ReactNode
  emptyMessage?: string
}

export function ContentSearchList({ items, renderItem, emptyMessage = "Ingen elementer funnet." }: ContentSearchListProps) {
  const [query, setQuery] = useState("")

  const filtered = query.trim()
    ? items.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase())
      )
    : items

  return (
    <div className="space-y-3">
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
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
          >
            ×
          </button>
        )}
      </div>

      {/* Count */}
      {query && (
        <p className="text-xs text-zinc-400">
          {filtered.length} av {items.length} resultater
        </p>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-zinc-400 text-sm">{query ? `Ingen treff på "${query}"` : emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => renderItem(item))}
        </div>
      )}
    </div>
  )
}
