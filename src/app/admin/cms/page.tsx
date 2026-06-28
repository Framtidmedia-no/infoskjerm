import { Topbar } from "@/components/admin/topbar"
import { listDisplayGroups, listDisplays, xiboAbout } from "@/lib/xibo/client"
import { Store, Monitor, CheckCircle2, AlertTriangle, Plus } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface XiboState {
  ok: boolean
  version?: string
  groups: { displayGroupId: number; displayGroup: string; description: string | null }[]
  displays: { displayId: number; display: string; loggedIn: number }[]
  error?: string
}

async function loadXibo(): Promise<XiboState> {
  try {
    const [about, groups, displays] = await Promise.all([
      xiboAbout(),
      listDisplayGroups(),
      listDisplays(),
    ])
    return {
      ok: true,
      version: about.version,
      groups: groups.map((g) => ({ displayGroupId: g.displayGroupId, displayGroup: g.displayGroup, description: g.description })),
      displays: displays.map((d) => ({ displayId: d.displayId, display: d.display, loggedIn: d.loggedIn })),
    }
  } catch (e) {
    return { ok: false, groups: [], displays: [], error: e instanceof Error ? e.message : "Ukjent feil" }
  }
}

export default async function CmsDashboardPage() {
  const state = await loadXibo()

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Skjermsystem" subtitle="Butikker og skjermer, drevet av infoskjerm-motoren" />

      <div className="flex-1 p-6 max-w-4xl space-y-6">
        {/* Connection status */}
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${state.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          {state.ok ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">Tilkoblet skjermsystemet</p>
                <p className="text-xs text-emerald-700">Motor versjon {state.version} · {state.groups.length} butikker · {state.displays.length} registrerte skjermer</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-900">Får ikke kontakt med skjermsystemet</p>
                <p className="text-xs text-red-700 truncate">{state.error}</p>
              </div>
            </>
          )}
        </div>

        {/* Stores */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Store className="w-4 h-4" /> Butikker
            </h2>
          </div>
          {state.groups.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-400">
              Ingen butikker ennå.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {state.groups.map((g) => (
                <div key={g.displayGroupId} className="rounded-xl border border-zinc-200 bg-white p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <Store className="w-5 h-5 text-zinc-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate">{g.displayGroup}</p>
                    {g.description && <p className="text-xs text-zinc-400 truncate">{g.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Screens */}
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900 mb-3">
            <Monitor className="w-4 h-4" /> Registrerte skjermer
          </h2>
          {state.displays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center">
              <Monitor className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-500">Ingen skjermer registrert ennå.</p>
              <p className="text-xs text-zinc-400 mt-1">Koble en Raspberry Pi til skjermsystemet, så dukker den opp her.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
              {state.displays.map((d) => (
                <div key={d.displayId} className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${d.loggedIn ? "bg-emerald-500" : "bg-zinc-300"}`} />
                  <span className="text-sm font-medium text-zinc-900 flex-1 truncate">{d.display}</span>
                  <span className="text-xs text-zinc-400">{d.loggedIn ? "Pålogget" : "Frakoblet"}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-zinc-400">
          Butikker, skjermer og innhold styres via det selvhostede skjermsystemet. Neste steg: legg ut nyheter og bygg base-layouten.
        </p>
      </div>
    </div>
  )
}
