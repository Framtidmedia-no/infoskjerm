"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { sendCommand } from "../actions"

interface ScreenActionButtonProps {
  screenId: string
  action: "reload" | "reboot" | "power_off" | "power_on"
}

const actionLabels = {
  reload: "Last inn på nytt",
  reboot: "Restart Pi",
  power_off: "Skjerm av",
  power_on: "Skjerm på",
}

export function ScreenActionButton({ screenId, action }: ScreenActionButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    const result = await sendCommand(screenId, action)
    if (!result.ok) {
      console.error("Feil ved sending av kommando:", result.error)
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className="p-1.5 text-zinc-400 hover:text-zinc-700 transition-colors rounded hover:bg-zinc-100 disabled:opacity-50"
      title={actionLabels[action]}
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
    </button>
  )
}
