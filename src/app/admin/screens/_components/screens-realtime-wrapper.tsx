"use client"

import { useMemo } from "react"
import { useScreenStatuses } from "@/lib/realtime/screens"
import { getScreenStatusColor } from "@/lib/admin/queries"
import { ScreenMapClient } from "./screen-map-client"
import { CheckCircle2, XCircle, Settings2, Monitor } from "lucide-react"

type StoreWithChain = {
  name: string
  chains: { name: string; color: string } | null
} | null

interface ScreenRow {
  id: string
  name: string
  status: string | null
  last_heartbeat: string | null
  last_seen_at: string | null
  pending_command: string | null
  power_state: string
  app_info: string | null
  stores: StoreWithChain
}

interface ScreensRealtimeWrapperProps {
  screens: ScreenRow[]
}

export function ScreensRealtimeWrapper({ screens: initialScreens }: ScreensRealtimeWrapperProps) {
  const liveStatuses = useScreenStatuses(
    initialScreens.map((s) => ({
      id: s.id,
      status: s.status,
      last_heartbeat: s.last_heartbeat,
    }))
  )

  const screens = useMemo(
    () =>
      initialScreens.map((s) => {
        const live = liveStatuses.get(s.id)
        if (!live) return s
        return {
          ...s,
          status: live.status ?? s.status,
          last_heartbeat: live.last_heartbeat ?? s.last_heartbeat,
        }
      }),
    [initialScreens, liveStatuses]
  )

  const online = screens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) === "green"
  ).length
  const offline = screens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) === "red"
  ).length
  const maintenance = screens.filter((s) => s.status === "maintenance").length

  const stats = [
    { icon: CheckCircle2, label: "Online", count: online, color: "text-emerald-600", bg: "bg-emerald-50" },
    { icon: XCircle, label: "Offline", count: offline, color: "text-red-600", bg: "bg-red-50" },
    { icon: Settings2, label: "Vedlikehold", count: maintenance, color: "text-zinc-500", bg: "bg-zinc-100" },
    { icon: Monitor, label: "Totalt", count: initialScreens.length, color: "text-blue-600", bg: "bg-blue-50" },
  ]

  return (
    <>
      {/* Realtime stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map(({ icon: Icon, label, count, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-zinc-100 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900">{count}</p>
              <p className="text-xs text-zinc-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Live map */}
      <ScreenMapClient screens={screens} />
    </>
  )
}
