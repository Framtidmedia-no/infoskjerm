"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Megaphone, Monitor, Layers, LayoutGrid } from "lucide-react"
import { ScreenPill, DeckContent } from "./fleet-decks"
import type { CardSpec, ContentKind } from "./types"

/**
 * Coverflow-karusellen — senterkortet i fokus, sidekortene tilter bakover.
 * Delt mellom den ordinære scenen (ekte skjermer) og onboarding-scenen
 * (eksempelvisning). Hva kortene viser bestemmes av `cards`; karusellen selv
 * er tilstandsløs utover aktivt kort.
 */

const KIND_META: Record<ContentKind, { icon: typeof Megaphone; cls: string }> = {
  kunde: { icon: Megaphone, cls: "text-emerald-300 bg-emerald-400/10" },
  intern: { icon: Monitor, cls: "text-sky-300 bg-sky-400/10" },
  kpi: { icon: Monitor, cls: "text-sky-300 bg-sky-400/10" },
  demo: { icon: LayoutGrid, cls: "text-amber-300 bg-amber-400/10" },
}

export function Coverflow({ cards, active, onActive, footer }: { cards: CardSpec[]; active: number; onActive: (n: number) => void; footer: string }) {
  const [dragDx, setDragDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [unit, setUnit] = useState(240)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ x: 0, moved: 0 })

  // unit = stående korts bredde (responsiv). Liggende kort (bakrom/KPI) blir
  // bredere og lavere, som en TV ved siden av en telefon.
  const portraitH = Math.round((unit * 16) / 9)
  const widthOf = (o: CardSpec["orientation"]) => (o === "landscape" ? Math.round(unit * 1.55) : unit)
  const heightOf = (o: CardSpec["orientation"]) => (o === "landscape" ? Math.round((unit * 1.55 * 9) / 16) : portraitH)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => setUnit(Math.round(Math.min(300, Math.max(168, el.clientWidth * 0.55))))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), [])

  const clamp = (n: number) => Math.max(0, Math.min(cards.length - 1, n))
  const go = (n: number) => onActive(clamp(n))

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    setDragging(true)
    dragState.current = { x: e.clientX, moved: 0 }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragState.current.x
    dragState.current.moved = Math.max(dragState.current.moved, Math.abs(dx))
    setDragDx(dx)
  }
  const endDrag = () => {
    if (!dragging) return
    setDragging(false)
    const step = Math.round(-dragDx / (unit * 0.9))
    setDragDx(0)
    if (step !== 0) go(active + step)
  }
  const onWheel = (e: React.WheelEvent) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(d) < 18) return
    go(active + (d > 0 ? 1 : -1))
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1) }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1) }
  }

  return (
    <div className="relative z-10 flex flex-col">
      <div
        ref={trackRef}
        tabIndex={0}
        role="listbox"
        aria-label="Skjermflåte"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        className="relative cursor-grab touch-pan-y select-none overflow-hidden outline-none active:cursor-grabbing"
        style={{ perspective: 1800, height: portraitH + 120 }}
      >
        <div
          aria-hidden
          className="sf-floor pointer-events-none absolute"
          style={{ left: "-6%", right: "-6%", bottom: 0, height: 280, transform: "rotateX(76deg)", transformOrigin: "bottom center" }}
        />
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {(() => {
            // Bredde-bevisste sentre: stående og liggende kort ligger pent ved
            // siden av hverandre uten å skjule hverandre.
            const widths = cards.map((c) => widthOf(c.orientation))
            const centers = new Array<number>(cards.length).fill(0)
            for (let i = active + 1; i < cards.length; i++) centers[i] = centers[i - 1] + (widths[i - 1] + widths[i]) / 2 * 0.6 + 8
            for (let i = active - 1; i >= 0; i--) centers[i] = centers[i + 1] - (widths[i] + widths[i + 1]) / 2 * 0.6 - 8
            return cards.map((c, i) => {
              const abs = Math.abs(i - active)
              if (abs > 3) return null
              const sign = Math.sign(i - active)
              const x = centers[i] + (dragging ? dragDx : 0)
              const rotateY = abs === 0 ? 0 : -sign * 44
              const z = abs === 0 ? 0 : -abs * unit * 0.68
              const scale = abs === 0 ? 1 : Math.max(0.66, 0.8 - (abs - 1) * 0.08)
              const opacity = Math.max(0.14, 1 - abs * 0.28)
              const isCenter = abs === 0
              return (
                <div
                  key={c.key}
                  onClick={() => { if (!isCenter && dragState.current.moved < 6) go(i) }}
                  className="absolute left-1/2 top-[47%]"
                  style={{
                    width: widths[i],
                    height: heightOf(c.orientation),
                    transform: `translate(-50%,-50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    zIndex: 100 - abs,
                    transition: dragging ? "none" : "transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.55s ease",
                    cursor: isCenter ? "inherit" : "pointer",
                  }}
                >
                  <div
                    className={`${reduced || !isCenter ? "" : "sf-deck-in"} h-full w-full overflow-hidden rounded-[22px] border`}
                    style={{
                      borderColor: isCenter ? "color-mix(in oklab, var(--brand-primary) 48%, rgba(255,255,255,0.14))" : "rgba(255,255,255,0.1)",
                      boxShadow: isCenter
                        ? "0 64px 128px -28px rgba(0,0,0,0.92), 0 0 90px -24px color-mix(in oklab, var(--brand-primary) 72%, transparent)"
                        : "0 40px 82px -30px rgba(0,0,0,0.85)",
                    }}
                  >
                    <DeckContent spec={c} w={widths[i]} active={isCenter} />
                  </div>
                  {!isCenter && <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px]" style={{ background: "rgba(8,8,10,0.34)" }} />}
                </div>
              )
            })
          })()}
        </div>

        <button onClick={() => go(active - 1)} aria-label="Forrige skjerm" className="absolute left-2 top-1/2 z-[200] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,24,0.72)] text-[#c9c8d0] backdrop-blur-md transition-colors hover:border-white/25 hover:text-white sm:left-6">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={() => go(active + 1)} aria-label="Neste skjerm" className="absolute right-2 top-1/2 z-[200] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,24,0.72)] text-[#c9c8d0] backdrop-blur-md transition-colors hover:border-white/25 hover:text-white sm:right-6">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Aktiv skjerm: pille + skjermtype + avdeling + prikker */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-4 pb-3 pt-4">
        {cards[active] && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ScreenPill pill={cards[active].pill} big />
            <ActiveChip icon={KIND_META[cards[active].contentKind].icon} cls={KIND_META[cards[active].contentKind].cls}>{cards[active].contentLabel}</ActiveChip>
            <ActiveChip icon={Layers} cls="text-zinc-300 border-white/10 bg-white/5">{cards[active].avdeling}</ActiveChip>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {cards.map((c, i) => (
            <button key={c.key} onClick={() => go(i)} aria-label={`Skjerm ${i + 1}`} className="h-1.5 rounded-full transition-all" style={{ width: i === active ? 22 : 6, background: i === active ? "var(--brand-primary)" : "rgba(255,255,255,0.22)" }} />
          ))}
        </div>
        <p className="text-center text-[12px] font-semibold text-[#55545c]">{footer}</p>
      </div>
    </div>
  )
}

function ActiveChip({ icon: Icon, cls, children }: { icon: typeof Megaphone; cls: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  )
}
