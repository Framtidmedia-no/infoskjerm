import { cn } from "@/lib/utils"
import { getScreenStatusColor } from "@/lib/admin/queries"

interface ScreenStatusDotProps {
  status: string | null
  lastHeartbeat: string | null
  showLabel?: boolean
  size?: "sm" | "md"
}

const colorMap = {
  green: { dot: "bg-emerald-500", ring: "ring-emerald-200", label: "Online", text: "text-emerald-700", bg: "bg-emerald-50" },
  yellow: { dot: "bg-amber-400", ring: "ring-amber-200", label: "Treg", text: "text-amber-700", bg: "bg-amber-50" },
  red: { dot: "bg-red-500", ring: "ring-red-200", label: "Offline", text: "text-red-700", bg: "bg-red-50" },
}

export function ScreenStatusDot({ status, lastHeartbeat, showLabel = false, size = "sm" }: ScreenStatusDotProps) {
  const color = getScreenStatusColor(status, lastHeartbeat)
  const { dot, ring, label, text, bg } = colorMap[color]
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5"

  if (!showLabel) {
    return (
      <span className={cn("inline-block rounded-full ring-2", dotSize, dot, ring)} />
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", bg, text)}>
      <span className={cn("rounded-full", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2", dot)} />
      {label}
    </span>
  )
}
