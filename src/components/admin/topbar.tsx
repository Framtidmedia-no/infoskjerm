import { ChevronLeft } from "lucide-react"
import Link from "next/link"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  backHref?: string
}

export function Topbar({ title, subtitle, actions, backHref }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl">
      <div
        className="h-0.5 w-full"
        style={{
          background:
            "linear-gradient(90deg, var(--brand-primary), color-mix(in oklab, var(--brand-primary) 35%, transparent) 55%, transparent 90%)",
        }}
      />

      <div className="flex flex-col gap-2.5 px-4 py-3 sm:min-h-[60px] sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-1 sm:flex-1">
          {backHref && (
            <Link
              href={backHref}
              className="mr-1 flex shrink-0 items-center gap-1 rounded-lg px-1.5 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Tilbake
            </Link>
          )}
          <div className="min-w-0">
            <h1 className="font-display truncate text-xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-2xl">
              {title}
            </h1>
            {subtitle && <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>}
          </div>
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}
