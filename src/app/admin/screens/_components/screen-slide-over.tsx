"use client"

import { useState, useEffect } from "react"
import { X, RefreshCw, Power, PowerOff, Settings2, Info, Clock, Wifi, WifiOff, RotateCcw, Tv2, BarChart3, CloudSun, Image as ImageIcon, Trophy, Newspaper, Layers, Eye, PlayCircle, ListVideo, AlertCircle } from "lucide-react"
import { sendCommand, setMaintenanceMode } from "../actions"

interface SlideInfo {
  id: string
  contentItemId: string
  moduleKey: string
  fields: Record<string, unknown>
  durationSeconds: number
}

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

const MODULE_ICONS: Record<string, React.ElementType> = {
  news: Newspaper,
  internal_news: Newspaper,
  competition: Trophy,
  stats: BarChart3,
  sales_stats: BarChart3,
  weather: CloudSun,
  slide: Layers,
  product_offer: ImageIcon,
  default: Layers,
}

const MODULE_LABELS: Record<string, string> = {
  internal_news: "Intern nyhet",
  internal_news_module: "Intern nyhet",
  competition_module: "Konkurranse",
  competition: "Konkurranse",
  sales_stats: "Salgstall",
  sales_stats_module: "Salgstall",
  weather_module: "Vær",
  product_offer: "Tilbud",
  product_offer_module: "Tilbud",
  employee_spotlight: "Ansatt i fokus",
  lunch_menu: "Lunsj-meny",
  shift_schedule: "Vaktliste",
  countdown_timer: "Nedtelling",
  birthday_announcement: "Bursdag",
  company_info: "Firmainfo",
  queue_status: "Køstatus",
  slide_module: "Slide",
  video_module: "Video",
  custom_url: "Nettside",
}

function getModuleLabel(moduleKey: string): string {
  return MODULE_LABELS[moduleKey] ?? moduleKey.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function getModuleIcon(moduleKey: string): React.ElementType {
  if (moduleKey.includes("news")) return Newspaper
  if (moduleKey.includes("compet")) return Trophy
  if (moduleKey.includes("stats") || moduleKey.includes("sales")) return BarChart3
  if (moduleKey.includes("weather")) return CloudSun
  if (moduleKey.includes("video")) return PlayCircle
  if (moduleKey.includes("playlist")) return ListVideo
  return MODULE_ICONS[moduleKey] ?? Layers
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
  const [slides, setSlides] = useState<SlideInfo[]>([])
  const [loadingSlides, setLoadingSlides] = useState(false)
  const [playlistName, setPlaylistName] = useState<string | null>(null)

  useEffect(() => {
    if (!screen) { setSlides([]); setPlaylistName(null); return }
    setLoadingSlides(true)
    // Fetch slides
    fetch(`/api/screens/${screen.id}/current-content`, {
      credentials: "same-origin",
    })
      .then(r => r.json())
      .then((data: { slides?: SlideInfo[] }) => {
        setSlides(data.slides ?? [])
        setLoadingSlides(false)
      })
      .catch(() => setLoadingSlides(false))
    // Fetch playlist assignment
    fetch(`/api/admin/screens/${screen.id}/playlist-info`, {
      credentials: "same-origin",
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: { playlistName?: string } | null) => {
        if (data?.playlistName) setPlaylistName(data.playlistName)
      })
      .catch(() => {})
  }, [screen?.id])

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
        ? isMaintenance ? "Vedlikehold deaktivert ✓" : "Vedlikehold aktivert ✓"
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

  const totalDuration = slides.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0)
  const totalMin = Math.floor(totalDuration / 60)
  const totalSec = totalDuration % 60

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 z-50 w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-zinc-100 flex-shrink-0">
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

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 flex-shrink-0">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${healthColors[health]}`}>
            {health === "offline" ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {healthLabels[health]}
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{timeAgo(screen.last_heartbeat)}
            </span>
            {screen.app_info && (
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3" />{screen.app_info}
              </span>
            )}
          </div>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-y-auto">
          {/* Playlist / Innhold-oversikt */}
          <div className="p-5 border-b border-zinc-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Tv2 className="w-4 h-4 text-zinc-400" />
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
                  Innhold på skjermen
                </p>
              </div>
              {playlistName && (
                <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ListVideo className="w-3 h-3" />{playlistName}
                </span>
              )}
            </div>

            {loadingSlides ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 bg-zinc-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : slides.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <AlertCircle className="w-8 h-8 text-zinc-200 mb-2" />
                <p className="text-sm text-zinc-400">Ingen innhold er live på denne skjermen.</p>
                <p className="text-xs text-zinc-300 mt-1">Koble en spilleliste til skjermen og publiser innhold.</p>
              </div>
            ) : (
              <>
                {/* Duration summary */}
                <div className="flex items-center gap-2 text-xs text-zinc-400 mb-3">
                  <span>{slides.length} slides</span>
                  {totalDuration > 0 && (
                    <>
                      <span>·</span>
                      <span>{totalMin}m {totalSec.toString().padStart(2, "0")}s per runde</span>
                    </>
                  )}
                </div>

                {/* Slide list */}
                <div className="space-y-1.5">
                  {slides.map((slide, idx) => {
                    const Icon = getModuleIcon(slide.moduleKey)
                    const label = getModuleLabel(slide.moduleKey)
                    const titleFromFields = (slide.fields.title as string) || (slide.fields.name as string) || null

                    return (
                      <div
                        key={slide.id}
                        className="flex items-center gap-3 bg-zinc-50 rounded-xl px-3 py-2.5 group hover:bg-zinc-100 transition-colors"
                      >
                        <span className="text-[10px] text-zinc-300 w-4 text-right flex-shrink-0 font-mono">{idx + 1}</span>
                        <div className="w-7 h-7 rounded-lg bg-white border border-zinc-100 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-800 truncate">
                            {titleFromFields ?? label}
                          </p>
                          <p className="text-[10px] text-zinc-400">{label} · {slide.durationSeconds}s</p>
                        </div>
                        <a
                          href={`/preview/${slide.contentItemId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-zinc-300 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-white"
                          title="Forhåndsvis"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Fjernstyring */}
          <div className="p-5">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Fjernstyring</h3>

            {screen.pending_command && (
              <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3">
                <p className="text-xs text-blue-600 font-medium">
                  Venter kommando: <span className="font-bold">{screen.pending_command}</span>
                </p>
              </div>
            )}

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
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${screen.power_state === "off" ? "bg-emerald-50" : "bg-red-50"}`}>
                  {screen.power_state === "off"
                    ? <Power className="w-4 h-4 text-emerald-600" />
                    : <PowerOff className="w-4 h-4 text-red-500" />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {screen.power_state === "off" ? "Slå på skjerm" : "Slå av skjerm"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {screen.power_state === "off" ? "Sender signal om å skru på HDMI" : "Slår av HDMI-signal"}
                  </p>
                </div>
              </button>

              <button
                onClick={handleMaintenance}
                disabled={loading !== null}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors disabled:opacity-50 text-left ${isMaintenance ? "border-amber-200 bg-amber-50 hover:bg-amber-100" : "border-zinc-200 hover:bg-zinc-50"}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMaintenance ? "bg-amber-100" : "bg-zinc-100"}`}>
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
              <div className={`mt-4 text-sm px-3 py-2 rounded-lg ${feedback.startsWith("Feil") ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
                {feedback}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
