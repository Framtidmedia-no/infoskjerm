"use client"

import { RefreshCw, Settings2, X, CheckSquare } from "lucide-react"
import { sendBulkCommand } from "../actions"
import { useState } from "react"

interface ScreenBulkBarProps {
  selectedIds: string[]
  onClearSelection: () => void
}

type BulkCommand = "reload" | "maintenance_on" | "maintenance_off"

export function ScreenBulkBar({ selectedIds, onClearSelection }: ScreenBulkBarProps) {
  const [loading, setLoading] = useState<BulkCommand | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (selectedIds.length === 0) return null

  async function handle(command: BulkCommand) {
    setLoading(command)
    setFeedback(null)
    const res = await sendBulkCommand(selectedIds, command)
    setLoading(null)
    if (res.ok) {
      setFeedback(`Sendt til ${selectedIds.length} skjerm(er) ✓`)
      setTimeout(() => {
        setFeedback(null)
        onClearSelection()
      }, 2000)
    } else {
      setFeedback(`Feil: ${res.error}`)
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-zinc-900 text-white rounded-xl px-4 py-2.5 mb-4 flex-wrap">
      <CheckSquare className="w-4 h-4 text-zinc-400" />
      <span className="text-sm font-medium">{selectedIds.length} valgt</span>

      <div className="h-4 w-px bg-zinc-700 mx-1" />

      <button
        onClick={() => handle("reload")}
        disabled={loading !== null}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading === "reload" ? "animate-spin" : ""}`} />
        Reload alle
      </button>

      <button
        onClick={() => handle("maintenance_on")}
        disabled={loading !== null}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
      >
        <Settings2 className="w-3.5 h-3.5" />
        Vedlikehold
      </button>

      <button
        onClick={() => handle("maintenance_off")}
        disabled={loading !== null}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors disabled:opacity-50"
      >
        Deaktiver vedlikehold
      </button>

      {feedback && <span className="text-xs text-emerald-400 ml-auto">{feedback}</span>}

      <button
        onClick={onClearSelection}
        className="ml-auto p-1.5 hover:bg-zinc-700 rounded-lg transition-colors"
        title="Fjern valg"
      >
        <X className="w-3.5 h-3.5 text-zinc-400" />
      </button>
    </div>
  )
}
