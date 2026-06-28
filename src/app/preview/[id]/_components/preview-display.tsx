"use client"

import { useState, useEffect } from "react"
import { ModuleRenderer } from "@/components/modules/module-renderer"

interface ContentBody {
  builder_v1?: {
    placements: Array<{
      id: string
      moduleKey: string
      moduleName: string
      fields: Record<string, unknown>
      durationSeconds: number
    }>
  }
}

interface ContentItem {
  id: string
  title: string
  body: unknown
  type: string
  status: string | null
}

export function PreviewDisplay({ item }: { item: ContentItem }) {
  const body = item.body as ContentBody
  const placements = body?.builder_v1?.placements ?? []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (placements.length === 0) return
    const placement = placements[currentIndex % placements.length]
    const duration = (placement?.durationSeconds ?? 10) * 1000

    const timer = setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % placements.length)
        setIsTransitioning(false)
      }, 500)
    }, duration)

    return () => clearTimeout(timer)
  }, [currentIndex, placements])

  const current = placements.length > 0 ? placements[currentIndex % placements.length] : null

  return (
    <div className="w-screen h-screen bg-zinc-950 overflow-hidden relative" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div className="relative z-10 h-full transition-opacity duration-500" style={{ opacity: isTransitioning ? 0 : 1 }}>
        {placements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <p className="text-2xl font-medium">{item.title}</p>
            <p className="text-lg mt-2">Ingen moduler i dette innholdet</p>
          </div>
        ) : current ? (
          <ModuleRenderer moduleKey={current.moduleKey} fields={current.fields} />
        ) : null}
      </div>
      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-10 py-4 bg-gradient-to-t from-black/60 to-transparent">
        <span className="text-zinc-400 text-sm font-medium">{item.title}</span>
        {placements.length > 1 && (
          <div className="flex items-center gap-2">
            {placements.map((_, i) => (
              <button key={i} onClick={() => setCurrentIndex(i)}
                className={`rounded-full transition-all ${i === currentIndex % placements.length ? "w-6 h-2 bg-white" : "w-2 h-2 bg-zinc-600"}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
