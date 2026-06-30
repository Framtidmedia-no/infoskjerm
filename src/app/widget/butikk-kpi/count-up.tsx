"use client"

import { useEffect, useState } from "react"

/**
 * Counts a number up from 0 to its value on mount (ease-out) for a bit of wow on
 * the KPI dashboard. Self-contained Norwegian thousands formatting so it works
 * as a client island inside the server-rendered KPI page.
 */
export function CountUp({ value, suffix = "", digits = 0 }: { value: number | null; suffix?: string; digits?: number }) {
  const [n, setN] = useState(0)

  useEffect(() => {
    if (value == null) return
    let raf = 0
    let start = 0
    const dur = 1300
    const tick = (t: number) => {
      if (!start) start = t
      const p = Math.min(1, (t - start) / dur)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  if (value == null) return <>–</>
  return <>{n.toLocaleString("nb-NO", { minimumFractionDigits: digits, maximumFractionDigits: digits })}{suffix}</>
}
