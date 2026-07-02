/**
 * Side-skeleton for admin-flatene: topbar-stripe + valgfri stat-rad + enten
 * pillekort-rader («tabell») eller kort-grid («grid»). Formen speiler de
 * ferdige flatene så innholdet lander uten hopp.
 */
export function PageSkeleton({ variant = "tabell", rows = 6, stats = false }: { variant?: "tabell" | "grid"; rows?: number; stats?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Laster innhold">
      <div className="sticky top-0 z-30 border-b border-zinc-200/60 bg-white/70 backdrop-blur-xl">
        <div className="h-0.5 w-full bg-zinc-100" />
        <div className="flex min-h-[60px] items-center gap-4 px-4 py-3 sm:px-6">
          <div className="skeleton h-7 w-44" />
          <div className="ml-auto flex items-center gap-2">
            <div className="skeleton h-8 w-24 rounded-full" />
            <div className="skeleton h-8 w-28 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6">
        {stats && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="skeleton h-[70px] rounded-2xl" />
            <div className="skeleton h-[70px] rounded-2xl" />
            <div className="skeleton h-[70px] rounded-2xl" />
            <div className="skeleton col-span-2 h-[70px] rounded-2xl" />
          </div>
        )}
        <div className="skeleton h-12 rounded-2xl" />
        {variant === "tabell" ? (
          <div className="space-y-2.5 pt-2">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="skeleton h-[64px] rounded-2xl" style={{ opacity: 1 - i * 0.09 }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="skeleton h-56 rounded-2xl" style={{ opacity: 1 - i * 0.07 }} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
