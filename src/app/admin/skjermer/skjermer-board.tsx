"use client"

import { useState } from "react"
import Link from "next/link"
import { Monitor, MonitorOff, Store, Wifi, WifiOff } from "lucide-react"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { StoreKioskInline } from "./store-kiosk-inline"
import type { StoreScreen, ScreenRole } from "@/lib/xibo/screens"
import type { Flate } from "./actions"

/** Xibo-skjerm + hva den er satt opp mot i vår admin (flate + avdeling). */
export type BoardScreen = StoreScreen & { assignedFlate?: Flate; assignedAvdeling?: string }

export interface BoardStore {
  id: string
  name: string
  chainName: string
  chainColor: string
  screens: BoardScreen[]
  hasKioskPassword: boolean
}

type Filter = "alle" | ScreenRole

const ROLE_CHIP: Record<ScreenRole, string> = {
  kunde: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  bakrom: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  avdeling: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "kunde", label: "Kunde" },
  { key: "bakrom", label: "Bakrom" },
  { key: "avdeling", label: "Avdeling" },
]

function Stat({ label, value, icon: Icon, iconCls, glow, delay }: { label: string; value: number; icon: React.ElementType; iconCls: string; glow: string | null; delay: number }) {
  return (
    <div
      className="fx-rise relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      {glow && (
        <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 h-20 w-24 rounded-full" style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }} />
      )}
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="font-display block text-2xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums">{value}</span>
        <span className="mt-1 block truncate text-[11px] text-zinc-500">{label}</span>
      </span>
    </div>
  )
}

export function SkjermerBoard({ stores }: { stores: BoardStore[] }) {
  const { unitLabel, avdelinger, avdelingerIntern } = useTenantConfig()
  const [filter, setFilter] = useState<Filter>("alle")

  // Hva skjermen er SATT OPP mot i admin: «Kundeskjerm · Frukt & grønt» osv.
  const assignmentLabel = (sc: BoardScreen): string | null => {
    if (!sc.assignedFlate) return null
    const flateLabel = sc.assignedFlate === "intern" ? "Internskjerm" : "Kundeskjerm"
    const list = sc.assignedFlate === "intern" ? avdelingerIntern : avdelinger
    const avd = list.find((a) => a.key === (sc.assignedAvdeling ?? "felles"))?.label ?? sc.assignedAvdeling
    return avd ? `${flateLabel} · ${avd}` : flateLabel
  }

  const all = stores.flatMap((s) => s.screens)
  const online = all.filter((s) => s.online).length
  const count = (f: Filter) => (f === "alle" ? all.length : all.filter((s) => s.role === f).length)

  const ordered = stores
    .map((s) => ({ ...s, shown: s.screens.filter((sc) => filter === "alle" || sc.role === filter) }))
    .filter((s) => filter === "alle" || s.shown.length > 0)
    .sort((a, b) => {
      if ((a.shown.length > 0) !== (b.shown.length > 0)) return b.shown.length - a.shown.length
      return a.name.localeCompare(b.name, "nb")
    })

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Skjermer totalt" value={all.length} icon={Monitor} iconCls="bg-sky-50 text-sky-600" glow="rgba(14,165,233,0.10)" delay={0} />
        <Stat label="Pålogget" value={online} icon={Wifi} iconCls={online > 0 ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"} glow={online > 0 ? "rgba(16,185,129,0.12)" : null} delay={60} />
        <Stat label="Frakoblet" value={all.length - online} icon={WifiOff} iconCls={all.length - online > 0 ? "bg-red-50 text-red-500" : "bg-zinc-100 text-zinc-400"} glow={all.length - online > 0 ? "rgba(239,68,68,0.12)" : null} delay={120} />
        <Stat label="Butikker m/ skjerm" value={stores.filter((s) => s.screens.length > 0).length} icon={Store} iconCls="bg-indigo-50 text-indigo-600" glow={null} delay={180} />
      </div>

      <div className="fx-rise inline-flex rounded-xl border border-zinc-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]" style={{ animationDelay: "220ms" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-[10px] px-3.5 py-1.5 text-xs font-semibold transition-all ${filter === f.key ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
          >
            {f.label} <span className={filter === f.key ? "text-white/60" : "text-zinc-400"}>{count(f.key)}</span>
          </button>
        ))}
      </div>

      {ordered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <MonitorOff className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">Ingen skjermer i denne visningen</p>
          <p className="text-xs text-zinc-400 mt-1">Prøv et annet filter, eller koble til en skjerm i {unitLabel.toLowerCase()}en.</p>
        </div>
      ) : (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {ordered.map((store) => (
          <div key={store.id} className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-14px_rgba(16,24,40,0.22)]">
            <span aria-hidden className="h-1 w-full flex-shrink-0" style={{ backgroundColor: store.chainColor }} />
            <Link
              href={`/admin/stores/${store.id}`}
              className="flex items-center gap-2.5 px-5 py-4 border-b border-zinc-50 hover:bg-zinc-50/70 transition-colors"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: store.chainColor }} />
              <div className="min-w-0">
                <h3 className="font-display truncate font-semibold leading-tight tracking-tight text-zinc-900">{store.name}</h3>
                <p className="text-[11px] text-zinc-400 truncate">{store.chainName}</p>
              </div>
              <span className="ml-auto text-xs text-zinc-400 flex-shrink-0">
                {store.shown.length} skjerm{store.shown.length !== 1 ? "er" : ""}
              </span>
            </Link>

            <div className="p-3 space-y-2 flex-1">
              {store.shown.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-zinc-200 px-2 py-5 text-center">
                  <MonitorOff className="h-5 w-5 text-zinc-300" />
                  <p className="text-xs text-zinc-400">Ingen skjerm tilkoblet ennå</p>
                </div>
              ) : (
                store.shown.map((sc) => (
                  <div key={sc.displayId} className="flex items-start gap-3 rounded-xl bg-zinc-50/70 px-3 py-2.5">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${sc.online ? "animate-pulse bg-emerald-500 ring-2 ring-emerald-100" : "bg-red-400 ring-2 ring-red-100"}`}
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
                      {assignmentLabel(sc)
                        ? <p className="text-[11px] font-medium text-zinc-600 truncate">Satt opp: {assignmentLabel(sc)}</p>
                        : sc.currentLayout && <p className="text-[11px] text-zinc-400 truncate">Viser: {sc.currentLayout}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <StoreKioskInline storeId={store.id} storeName={store.name} hasPassword={store.hasKioskPassword} />
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
