/**
 * Route-level skeleton for alle admin-sider. Alle sidene er force-dynamic og
 * flere venter på live Xibo-kall — uten denne føles navigasjonen «død» til
 * serveren svarer. Rendres inne i admin-layouten (sidebar forblir interaktiv).
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-label="Laster innhold">
      {/* Topbar-skjelett */}
      <div className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6">
        <div className="space-y-1.5">
          <div className="h-4 w-36 animate-pulse rounded-md bg-zinc-200" />
          <div className="h-2.5 w-20 animate-pulse rounded-md bg-zinc-100" />
        </div>
        <div className="h-8 w-28 animate-pulse rounded-lg bg-zinc-100" />
      </div>

      {/* Innholds-skjelett: kortgrid som matcher de fleste flatene */}
      <div className="flex-1 p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] p-4">
              <div className="mb-3 h-24 animate-pulse rounded-xl bg-zinc-100" />
              <div className="mb-2 h-3.5 w-3/4 animate-pulse rounded-md bg-zinc-200" />
              <div className="h-2.5 w-1/2 animate-pulse rounded-md bg-zinc-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
