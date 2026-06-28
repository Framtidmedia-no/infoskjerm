"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface ScreenStatus {
  id: string
  status: string | null
  last_heartbeat: string | null
}

export function useScreenStatuses(initialStatuses: ScreenStatus[]) {
  const [statuses, setStatuses] = useState<Map<string, ScreenStatus>>(
    new Map(initialStatuses.map((s) => [s.id, s]))
  )

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("screen-statuses")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "screens",
        },
        (payload) => {
          const updated = payload.new as ScreenStatus
          setStatuses((prev) => {
            const next = new Map(prev)
            next.set(updated.id, updated)
            return next
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return statuses
}
