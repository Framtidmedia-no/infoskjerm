"use client"

import { useRef, useState, useEffect } from "react"

const REF_W = 1920
const REF_H = 1080

/**
 * Renders children at a fixed 1920×1080 reference resolution and scales the
 * whole canvas to fit its parent. This makes every module — whether it uses
 * fixed px/rem sizes or container-query units — render identically in the small
 * admin preview and on a full TV, with no per-module responsive work.
 */
export function ScaledScreen({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width === 0 || height === 0) return
      setScale(Math.min(width / REF_W, height / REF_H))
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden flex items-center justify-center bg-black"
    >
      <div
        style={{
          width: REF_W,
          height: REF_H,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
          // hide until first measurement to avoid a flash at scale 0
          opacity: scale > 0 ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}
