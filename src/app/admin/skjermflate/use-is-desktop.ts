"use client"

import { useEffect, useState } from "react"

/**
 * true kun på desktop (lg+). Starter false (SSR + mobil), så coverflow-en (tung
 * 3D/blur/iframes som krasjer iOS Safari) rendres ALDRI på mobil — `display:none`
 * holder ikke, for skjulte iframes/kompositt-lag lastes likevel.
 */
export function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)")
    const on = () => setDesktop(mq.matches)
    on()
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return desktop
}
