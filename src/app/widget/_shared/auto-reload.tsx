"use client"

import { useEffect } from "react"

/**
 * Reloads the page on a fixed interval so a static widget (e.g. the KPI
 * dashboards, which have no internal rotation) picks up freshly synced data
 * without anyone touching the screen. Mirrors the 10-min reload the news/offer
 * rotators already do.
 */
export function AutoReload({ minutes = 10 }: { minutes?: number }) {
  useEffect(() => {
    const id = setTimeout(() => window.location.reload(), minutes * 60 * 1000)
    return () => clearTimeout(id)
  }, [minutes])

  return null
}
