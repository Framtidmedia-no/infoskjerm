"use client"

import { useEffect, useState, type ReactNode } from "react"
import type { LiveItem } from "@/lib/content/live"

/**
 * Ekte crossfade mellom kort («Levende skjerm»): forrige kort holdes montert i
 * overgangstiden og fader ut med lett nedskalering, mens nytt kort fader inn
 * med et lite løft. Maks 2 kort i DOM samtidig; kun transform/opacity animeres
 * (Raspberry Pi er ytelsesgulvet). Fyller nærmeste posisjonerte forelder —
 * rotatoren eier plasseringen (f.eks. plass til ticker i bunn).
 */

const TRANSITION_MS = 800

const KEYFRAMES =
  "@keyframes lsSceneIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes lsSceneOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.985)}}@media (prefers-reduced-motion: reduce){.ls-scene{animation:none!important}}"

interface Scene {
  key: string
  node: ReactNode
}

interface SceneState {
  current: Scene
  prev: Scene | null
}

export function SceneTransition({ itemKey, children }: { itemKey: string; children: ReactNode }) {
  const [scenes, setScenes] = useState<SceneState>({ current: { key: itemKey, node: children }, prev: null })

  // Betinget setState under render — Reacts dokumenterte mønster for derivert
  // state («adjusting state when props change»): fanger forrige kort idet
  // nøkkelen bytter, uten ref-lesing i render og uten ekstra effekt-lag.
  if (scenes.current.key !== itemKey) {
    setScenes({ current: { key: itemKey, node: children }, prev: scenes.current })
  }

  const prev = scenes.prev
  useEffect(() => {
    if (!prev) return
    const id = setTimeout(() => setScenes((s) => ({ ...s, prev: null })), TRANSITION_MS)
    return () => clearTimeout(id)
  }, [prev])

  return (
    <>
      <style>{KEYFRAMES}</style>
      {prev && (
        <div key={`prev-${prev.key}`} className="ls-scene" style={{ position: "absolute", inset: 0, overflow: "hidden", animation: `lsSceneOut ${TRANSITION_MS}ms ease-out forwards`, pointerEvents: "none" }}>
          {prev.node}
        </div>
      )}
      <div key={`cur-${itemKey}`} className="ls-scene" style={{ position: "absolute", inset: 0, overflow: "hidden", animation: `lsSceneIn ${TRANSITION_MS}ms cubic-bezier(.16,1,.3,1)` }}>
        {children}
      </div>
    </>
  )
}

/** Forhåndslast neste korts bilde så innfasingen aldri viser et halvlastet
 *  bilde. Video preloades ikke (Image() kan ikke laste video — stille no-op). */
export function usePreloadNext(next: LiveItem | null) {
  const url = next && !next.isVideo ? (next.pages[0] ?? next.imageUrl) : null
  useEffect(() => {
    if (!url) return
    const img = new Image()
    img.src = url
  }, [url])
}
