"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Live mini-forhåndsvisning av en HTML-side i lister/dialoger. Rendrer content-
 * routen i EKTE designoppløsning (1920×1080 / 1080×1920) i en sandbox-iframe og
 * skalerer den ned til miniatyren med transform — så kortet viser det ekte
 * innholdet, ikke en plassholder. `loading="lazy"` så bare synlige kort laster.
 */
export function HtmlThumb({ id, portrait = false, className }: { id: string; portrait?: boolean; className?: string }) {
  const [dw, dh] = portrait ? [1080, 1920] : [1920, 1080]
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // «cover»: fyll miniatyren (beskjær litt) i stedet for å letterboxe.
    const measure = () => setScale(Math.max(el.clientWidth / dw, el.clientHeight / dh))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [dw, dh])

  return (
    <div ref={ref} className={cn("relative overflow-hidden bg-black", className)}>
      <iframe
        src={`/widget/html-content/${id}?o=${portrait ? "portrait" : "landscape"}`}
        title=""
        tabIndex={-1}
        loading="lazy"
        sandbox="allow-scripts"
        scrolling="no"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: dw,
          height: dh,
          transformOrigin: "top left",
          transform: `scale(${scale || 0.0001})`,
          border: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  )
}
