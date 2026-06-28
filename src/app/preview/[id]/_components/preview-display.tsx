"use client"

import { useState, useEffect } from "react"
import { ModuleRenderer } from "@/components/modules/module-renderer"
import { ScaledScreen } from "@/components/screen/scaled-screen"
import { ZoneLayoutRenderer } from "@/components/modules/zone-layout-renderer"
import type { ZoneModule } from "@/lib/builder/types"

interface ContentBody {
  builder_v2?: {
    layoutId: string
    zones: Record<string, ZoneModule>
    durationSeconds: number
  }
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

  // v2 — composed screen (multiple modules in zones, all visible at once)
  if (body?.builder_v2) {
    const { layoutId, zones } = body.builder_v2
    const hasContent = Object.keys(zones ?? {}).length > 0
    return (
      <div className="w-screen h-screen bg-black overflow-hidden">
        {hasContent ? (
          <ScaledScreen>
            <ZoneLayoutRenderer layoutId={layoutId} zones={zones} />
          </ScaledScreen>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <p className="text-2xl font-medium">{item.title}</p>
            <p className="text-lg mt-2">Ingen moduler lagt til ennå</p>
          </div>
        )}
      </div>
    )
  }

  // v1 — legacy sequential slideshow
  return <LegacySlideshow item={item} body={body} />
}

function LegacySlideshow({ item, body }: { item: ContentItem; body: ContentBody }) {
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
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      <div className="absolute inset-0 transition-opacity duration-500" style={{ opacity: isTransitioning ? 0 : 1 }}>
        {placements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500">
            <p className="text-2xl font-medium">{item.title}</p>
            <p className="text-lg mt-2">Ingen moduler i dette innholdet</p>
          </div>
        ) : current ? (
          <ScaledScreen>
            <ModuleRenderer moduleKey={current.moduleKey} fields={current.fields} />
          </ScaledScreen>
        ) : null}
      </div>
      {placements.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-t from-black/60 to-transparent">
          {placements.map((_, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all ${i === currentIndex % placements.length ? "w-6 h-2 bg-white" : "w-2 h-2 bg-zinc-600"}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
