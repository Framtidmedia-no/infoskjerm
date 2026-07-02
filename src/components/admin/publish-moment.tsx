"use client"

import { useEffect } from "react"
import { Check } from "lucide-react"

const KONFETTI = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"]

/**
 * Belønningsøyeblikket etter publisering: mørkt bakteppe, poppende
 * emerald-hake med glød, display-tekst og et diskret konfettidryss.
 * Kaller onDone etter ~1,6 s (reduced motion: ~0,8 s) — typisk navigering
 * videre. Samme fx-språk som påmeldings-suksessen.
 */
export function PublishMoment({ show, onDone }: { show: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!show) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const t = setTimeout(onDone, reduce ? 800 : 1600)
    return () => clearTimeout(t)
  }, [show, onDone])

  if (!show) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-zinc-950/55 backdrop-blur-[3px]" role="status" aria-live="polite">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
        {KONFETTI.map((farge, i) => (
          <span
            key={i}
            className="fx-confetti-piece"
            style={{
              backgroundColor: farge,
              left: `${38 + i * 4.5}%`,
              ["--fx-d" as string]: `${i * 0.12}s`,
            }}
          />
        ))}
      </div>
      <div className="fx-rise flex flex-col items-center rounded-3xl bg-white px-12 py-10 shadow-[0_40px_110px_-24px_rgba(9,12,20,0.6)]">
        <span className="fx-pop flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_44px_-6px_rgba(16,185,129,0.5)]">
          <Check className="h-8 w-8 text-emerald-600" strokeWidth={3} />
        </span>
        <p className="font-display mt-4 text-xl font-bold tracking-tight text-zinc-900">Publisert!</p>
        <p className="mt-1 text-sm text-zinc-500">Skjermene henter nytt innhold.</p>
      </div>
    </div>
  )
}
