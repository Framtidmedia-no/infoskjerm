"use client"

import { useState, useEffect } from "react"
import { ModuleRenderer } from "@/components/modules/module-renderer"
import type { ModulePlacement } from "@/lib/builder/types"
import { Monitor, Tablet } from "lucide-react"

interface LivePreviewProps {
  placements: ModulePlacement[]
}

export function LivePreview({ placements }: LivePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [mode, setMode] = useState<'desktop' | 'tablet'>('desktop')

  useEffect(() => {
    if (placements.length === 0) return
    const placement = placements[currentIndex % placements.length]
    const duration = (placement?.durationSeconds ?? 10) * 1000

    const timer = setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % placements.length)
        setIsTransitioning(false)
      }, 400)
    }, duration)

    return () => clearTimeout(timer)
  }, [currentIndex, placements])

  useEffect(() => {
    setCurrentIndex(0)
  }, [placements.length])

  const currentPlacement = placements.length > 0 ? placements[currentIndex % placements.length] : null

  const aspectRatio = mode === 'desktop' ? '16/9' : '4/3'

  return (
    <div className="flex flex-col h-full">
      {/* Preview controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 bg-white">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Forhåndsvisning</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('desktop')}
            className={`p-1.5 rounded transition-colors ${mode === 'desktop' ? 'bg-zinc-100 text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'}`}
            title="16:9 desktop"
          >
            <Monitor className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode('tablet')}
            className={`p-1.5 rounded transition-colors ${mode === 'tablet' ? 'bg-zinc-100 text-zinc-800' : 'text-zinc-400 hover:text-zinc-600'}`}
            title="4:3 tablet"
          >
            <Tablet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex-1 flex items-center justify-center bg-zinc-100 p-4">
        <div
          className="bg-zinc-950 rounded-lg overflow-hidden shadow-2xl w-full"
          style={{ aspectRatio, maxHeight: '100%' }}
        >
          {placements.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600">
              <p className="text-sm">Dra en modul inn i canvas</p>
              <p className="text-xs text-zinc-700 mt-1">for å starte</p>
            </div>
          ) : (
            <div
              className="w-full h-full transition-opacity duration-400"
              style={{ opacity: isTransitioning ? 0 : 1 }}
            >
              {currentPlacement && (
                <ModuleRenderer
                  moduleKey={currentPlacement.moduleKey}
                  fields={currentPlacement.fields}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide indicators */}
      {placements.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 py-2 border-t border-zinc-100 bg-white">
          {placements.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all ${
                i === currentIndex % placements.length ? 'w-5 h-1.5 bg-zinc-600' : 'w-1.5 h-1.5 bg-zinc-300'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
