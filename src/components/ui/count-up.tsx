"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Teller display-tall opp ved mount (ease-out, ~0.6 s). Respekterer
 * prefers-reduced-motion og animerer kun første gang — senere verdiendringer
 * settes direkte.
 */
export function CountUp({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (hasAnimated.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      hasAnimated.current = true
      setDisplay(value)
      return
    }
    hasAnimated.current = true
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(eased * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])

  return <>{display}</>
}
