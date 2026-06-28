"use client"

import { useState } from "react"
import { X, RefreshCw, Power, PowerOff, Settings2, Info, Clock, Wifi, WifiOff, RotateCcw } from "lucide-react"
import { sendCommand, setMaintenanceMode } from "../actions"

interface ScreenData {
  id: string
  name: string
  status: string | null
  last_heartbeat: string | null
  last_seen_at: string | null
  store_name: string
  store_chain_name: string
  store_chain_color: string
  pending_command: string | null
  power_state: string
  app_info: string | null
}

interface ScreenSlideOverProps {
  screen: ScreenData | null
  onClose: () => void
}

function timeAgo(iso: string | null): string {
  if (!iso) return "aldri"
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff} sek siden`
  if (diff < 3600) return `${Math.floor(diff / 60)} min siden`
  if (diff < 86400) return `${Math.floor(diff / 3600)} timer siden`
  return `${Math.floor(diff / 86400)} dager siden`
}

function getHealth(status: string | null, lastHeartbeat: string | null): "online" | "warning" | "offline" | "maintenance" {
  if (status === "maintenance") return "maintenance"
  if (!lastHeartbeat) return "offline"
  const diff = Date.now() - new Date(lastHeartbeat).getTime()
  if (diff < 30_000) return "online"
  if (diff < 120_000) return "warning"
  return "offline"
}

type CommandKey = "reload" | "reboot" | "power_off" | "power_on"

export function ScreenSlideOver({ screen, onClose }: ScreenSlideOverProps) {
  const [loading, setLoading] = useState<CommandKey | "maintenance" | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!screen) return null

  const health = getHealth(screen.status, screen.last_heartbeat)
  const isMaintenance = screen.status === "maintenance"

  async function handleCommand(command: CommandKey) {
    setLoading(command)
    setFeedback(null)
    const res = await sendCommand(screen!.id, command)
    setLoading(null)
    setFeedback(res.ok ? "Kommando sendt ✓" : `Feil: ${res.error}`)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleMaintenance() {
    setLoading("maintenance")
    setFeedback(null)
    const res = await setMaintenanceMode(screen!.id, !isMaintenance)
    setLoading(null)
    setFeedback(
      res.ok
        ? isMaintenance
          ? "Vedlikehold deaktivert ✓"
          : "Vedlikehold aktivert ✓"
        : `Feil: ${res.error}`
    )
    setTimeout(() => setFeedback(null), 3000)
  }

  const healthColors = {
    online: "text-emerald-600 bg-emerald-50",
    warning: "text-amber-600 bg-amber-50",
    offline: "text-red-600 bg-red-50",
    maintenance: "text-zinc-500 bg-zinc-100",
  }

  const healthLabels = {
    online: "Online",
    warning: "Treg respons",
    offline: "Offline",
    maintenance: "Vedlikehold",
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: screen.store_chain_color }} />
              <span className="text-xs text-zinc-500 truncate">
                {screen.store_chain_name} · {screen.store_name}
              </span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 truncate">{screen.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-lg ml-2 flex-shrink-0">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Status section */}
        <div className="p-5 border-b border-zinc-100">
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${healthColors[health]}`}
          >
            {health === "offline" ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {healthLabels[health]}
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-zinc-500">Siste heartbeat</p>
                <p className="text-sm font-medium text-zinc-900">{timeAgo(screen.last_heartbeat)}</p>
              </div>
            </div>
            {screen.last_seen_at && (
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-zinc-500">Sist sett</p>
                  <p className="text-sm font-medium text-zinc-900">{timeAgo(screen.last_seen_at)}</p>
                </div>
              </div>
            )}
            {screen.app_info && (
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500">Appversjon</p>
                  <p className="text-sm font-medium text-zinc-900 font-mono">{screen.app_info}</p>
                </div>
              </div>
            )}
            {screen.pending_command && (
              <div className="bg-blue-50 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-600 font-medium">
                  Venter kommando: <span className="font-bold">{screen.pending_command}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Remote control */}
        <div className="p-5 flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Fjernstyring</h3>

          <div className="space-y-2">
            <button
              onClick={() => handleCommand("reload")}
              disabled={loading !== null}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <RefreshCw className={`w-4 h-4 text-blue-600 ${loading === "reload" ? "animate-spin" : ""}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">Last inn på nytt</p>
                <p className="text-xs text-zinc-400">Oppdaterer innholdet på skjermen</p>
              </div>
            </button>

            <button
              onClick={() => handleCommand("reboot")}
              disabled={loading !== null}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <RotateCcw className={`w-4 h-4 text-amber-600 ${loading === "reboot" ? "animate-spin" : ""}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">Restart Pi</p>
                <p className="text-xs text-zinc-400">Starter Raspberry Pi på nytt</p>
              </div>
            </button>

            <button
              onClick={() => handleCommand(screen.power_state === "off" ? "power_on" : "power_off")}
              disabled={loading !== null}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50 text-left"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  screen.power_state === "off" ? "bg-emerald-50" : "bg-red-50"
                }`}
              >
                {screen.power_state === "off" ? (
                  <Power className="w-4 h-4 text-emerald-600" />
                ) : (
                  <PowerOff className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {screen.power_state === "off" ? "Slå på skjerm" : "Slå av skjerm"}
                </p>
                <p className="text-xs text-zinc-400">
                  {screen.power_state === "off"
                    ? "Sender signal om å skru på HDMI"
                    : "Slår av HDMI-signal"}
                </p>
              </div>
            </button>

            <button
              onClick={handleMaintenance}
              disabled={loading !== null}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors disabled:opacity-50 text-left ${
                isMaintenance
                  ? "border-amber-200 bg-amber-50 hover:bg-amber-100"
                  : "border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isMaintenance ? "bg-amber-100" : "bg-zinc-100"
                }`}
              >
                <Settings2 className={`w-4 h-4 ${isMaintenance ? "text-amber-600" : "text-zinc-500"}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-900">
                  {isMaintenance ? "Deaktiver vedlikehold" : "Sett til vedlikehold"}
                </p>
                <p className="text-xs text-zinc-400">
                  {isMaintenance ? "Gjør skjermen aktiv igjen" : "Skjermen viser vedlikeholdsmelding"}
                </p>
              </div>
            </button>
          </div>

          {feedback && (
            <div
              className={`mt-4 text-sm px-3 py-2 rounded-lg ${
                feedback.startsWith("Feil") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {feedback}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
