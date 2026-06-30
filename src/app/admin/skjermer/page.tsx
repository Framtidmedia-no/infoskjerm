import { createClient } from "@/lib/supabase/server"
import { getStoresBoard } from "@/lib/admin/queries"
import { fetchScreensByStore, type StoreScreen, type ScreenRole } from "@/lib/xibo/screens"
import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"

/**
 * Fleet overview: every store and the real screens assigned to it, grouped and
 * coloured by role (kunde / bakrom / avdeling), with live online status, last-seen
 * and the layout each player reports showing. Read straight from the engine (Xibo)
 * via fetchScreensByStore, so it's truthful — no local screen table to drift.
 */

export const dynamic = "force-dynamic"

interface RawStore {
  id: string
  name: string
  city: string | null
}

const ROLE_CHIP: Record<ScreenRole, string> = {
  kunde: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  bakrom: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  avdeling: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "warn" && value > 0 ? "text-amber-600" : "text-zinc-900"
  return (
    <div className="rounded-2xl border border-zinc-100 bg-white px-5 py-4">
      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  )
}

export default async function SkjermerPage() {
  const supabase = await createClient()
  const chains = await getStoresBoard(supabase)

  const stores = chains.flatMap((c) =>
    ((c.stores as unknown as RawStore[]) ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      chainName: c.name as string,
      chainColor: (c.color as string | null) ?? "#9ca3af",
    }))
  )
  const byStore = await fetchScreensByStore(stores.map((s) => ({ id: s.id, name: s.name })))

  const allScreens: StoreScreen[] = stores.flatMap((s) => byStore.get(s.id) ?? [])
  const total = allScreens.length
  const online = allScreens.filter((s) => s.online).length
  const storesWithScreens = stores.filter((s) => (byStore.get(s.id)?.length ?? 0) > 0).length

  // Stores that have screens first, then alphabetical.
  const ordered = [...stores].sort((a, b) => {
    const ca = byStore.get(a.id)?.length ?? 0
    const cb = byStore.get(b.id)?.length ?? 0
    if ((ca > 0) !== (cb > 0)) return cb - ca
    return a.name.localeCompare(b.name, "nb")
  })

  return (
    <div className="flex flex-1 flex-col">
      <Topbar title="Skjermer" subtitle={`${total} skjermer i drift · ${online} pålogget`} />

      <div className="flex-1 p-6 space-y-6 max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Skjermer totalt" value={total} />
          <Stat label="Pålogget" value={online} tone="ok" />
          <Stat label="Frakoblet" value={total - online} tone="warn" />
          <Stat label="Butikker m/ skjerm" value={storesWithScreens} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((store) => {
            const screens = byStore.get(store.id) ?? []
            return (
              <div key={store.id} className="rounded-2xl border border-zinc-100 bg-white overflow-hidden flex flex-col">
                <Link
                  href={`/admin/stores/${store.id}`}
                  className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-50 hover:bg-zinc-50/70 transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: store.chainColor }} />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-zinc-900 truncate leading-tight">{store.name}</h3>
                    <p className="text-[11px] text-zinc-400 truncate">{store.chainName}</p>
                  </div>
                  <span className="ml-auto text-xs text-zinc-400 flex-shrink-0">
                    {screens.length} skjerm{screens.length !== 1 ? "er" : ""}
                  </span>
                </Link>

                <div className="p-3 space-y-2 flex-1">
                  {screens.length === 0 ? (
                    <p className="text-sm text-zinc-400 italic px-2 py-4 text-center">Ingen skjerm tilkoblet ennå</p>
                  ) : (
                    screens.map((sc) => (
                      <div key={sc.displayId} className="flex items-start gap-3 rounded-xl bg-zinc-50/70 px-3 py-2.5">
                        <span
                          className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${sc.online ? "bg-emerald-500 ring-2 ring-emerald-100" : "bg-zinc-300"}`}
                          title={sc.online ? "Pålogget" : "Frakoblet"}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-zinc-800 truncate">{sc.name}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_CHIP[sc.role]}`}>{sc.roleLabel}</span>
                          </div>
                          <p className="text-[11px] text-zinc-400">
                            {sc.online ? "Pålogget" : "Frakoblet"} · sist sett {sc.lastSeen ?? "aldri"}
                          </p>
                          {sc.currentLayout && <p className="text-[11px] text-zinc-400 truncate">Viser: {sc.currentLayout}</p>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
