"use client"

import { useEffect, useState } from "react"

export interface BakromPanel {
  /** Full widget URL to embed for this panel. */
  src: string
  /** How long this panel stays on screen before advancing. */
  seconds: number
}

/**
 * Back-room ("bakrom") screen rotator. Cycles full-screen through the existing
 * widget pages as iframes: internal news (all items, dwell computed from the
 * store's own content) → own KPI → all-stores week → all-stores year, then loops.
 *
 * Why one app-driven rotator instead of several Xibo layouts: the news dwell is
 * dynamic (3 items or 30?), so a fixed Xibo layout duration always guesses wrong.
 * Here the app owns all timing, adapts per store, and nothing is ever "stuck".
 * Each panel reloads fresh on every cycle (the key changes) so data stays current.
 */
export function BakromRotator({ panels }: { panels: BakromPanel[] }) {
  const [i, setI] = useState(0)
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    if (panels.length <= 1) return
    const secs = panels[i % panels.length]?.seconds ?? 10
    const id = setTimeout(() => {
      setI((v) => {
        const next = (v + 1) % panels.length
        if (next === 0) setCycle((c) => c + 1)
        return next
      })
    }, Math.max(5, secs) * 1000)
    return () => clearTimeout(id)
  }, [i, panels])

  if (panels.length === 0) {
    return (
      <main
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "rgba(255,255,255,.4)",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 34,
        }}
      >
        Ingen innhold
      </main>
    )
  }

  const panel = panels[i % panels.length]
  return (
    <iframe
      key={`${i}-${cycle}`}
      src={panel.src}
      title="bakrom"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", border: "none" }}
    />
  )
}
