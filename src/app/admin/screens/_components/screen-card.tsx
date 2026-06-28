import { Monitor, Wifi, WifiOff, Settings2 } from "lucide-react"

interface ScreenCardProps {
  screen: {
    id: string
    name: string
    status: string | null
    last_heartbeat: string | null
    last_seen_at: string | null
    store_name: string
    store_chain_color: string
    pending_command: string | null
    power_state: string
    app_info: string | null
  }
  isSelected: boolean
  onClick: () => void
  onSelect: (e: React.MouseEvent) => void
}

export function getHealth(status: string | null, lastHeartbeat: string | null): "online" | "warning" | "offline" | "maintenance" {
  if (status === "maintenance") return "maintenance"
  if (!lastHeartbeat) return "offline"
  const diff = Date.now() - new Date(lastHeartbeat).getTime()
  if (diff < 30_000) return "online"
  if (diff < 120_000) return "warning"
  return "offline"
}

const healthConfig = {
  online: { bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", pulse: true, label: "Online" },
  warning: { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400", pulse: false, label: "Treg" },
  offline: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", pulse: false, label: "Offline" },
  maintenance: { bg: "bg-zinc-50", border: "border-zinc-200", dot: "bg-zinc-400", pulse: false, label: "Vedlikehold" },
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "aldri"
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}t`
  return `${Math.floor(diff / 86400)}d`
}

export function ScreenCard({ screen, isSelected, onClick, onSelect }: ScreenCardProps) {
  const health = getHealth(screen.status, screen.last_heartbeat)
  const cfg = healthConfig[health]

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all select-none ${cfg.bg} ${
        isSelected ? "border-zinc-900 ring-2 ring-zinc-900 ring-offset-1" : cfg.border + " hover:border-zinc-300"
      }`}
    >
      {/* Select checkbox */}
      <div
        onClick={onSelect}
        className={`absolute top-3 left-3 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
          isSelected ? "bg-zinc-900 border-zinc-900" : "border-zinc-300 bg-white hover:border-zinc-500"
        }`}
      >
        {isSelected && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Chain color stripe */}
      <div className="absolute top-0 right-0 w-1 h-full rounded-r-xl" style={{ backgroundColor: screen.store_chain_color }} />

      <div className="pl-5">
        {/* Status row */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
            {cfg.pulse && (
              <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${cfg.dot} animate-ping opacity-75`} />
            )}
          </div>
          <span
            className={`text-xs font-semibold ${
              health === "online"
                ? "text-emerald-700"
                : health === "warning"
                  ? "text-amber-600"
                  : health === "maintenance"
                    ? "text-zinc-500"
                    : "text-red-600"
            }`}
          >
            {cfg.label}
          </span>
          {screen.pending_command && (
            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded ml-auto">
              ↑ {screen.pending_command}
            </span>
          )}
        </div>

        {/* Screen name */}
        <div className="flex items-start gap-2 mb-2">
          <Monitor className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">{screen.name}</p>
            <p className="text-xs text-zinc-500 truncate">{screen.store_name}</p>
          </div>
        </div>

        {/* Heartbeat */}
        <div className="flex items-center gap-1 mt-3">
          {health === "offline" ? (
            <WifiOff className="w-3 h-3 text-zinc-300" />
          ) : (
            <Wifi className="w-3 h-3 text-zinc-400" />
          )}
          <span className="text-xs text-zinc-400">
            {screen.last_heartbeat ? `${timeAgo(screen.last_heartbeat)} siden` : "Ikke sett"}
          </span>
          {screen.status === "maintenance" && <Settings2 className="w-3 h-3 text-zinc-400 ml-auto" />}
        </div>
      </div>
    </div>
  )
}
