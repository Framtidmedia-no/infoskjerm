"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Monitor, Wrench, Copy, Check, Plus, Trash2, Loader2, Smartphone, Wifi, WifiOff } from "lucide-react"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import {
  assignDisplay, setScreenAssignment, addKiosk, deleteScreenRow,
  type Flate, type Orientation, type Assignment,
} from "./actions"

/**
 * Én samlet skjerm-styring per butikk. To slags skjermer:
 *  1) Tilkoblede Xibo-skjermer (Raspberry Pi) — dukker opp automatisk fra Xibo,
 *     bindes til flate/avdeling/orientering inline (via xibo_display_id).
 *  2) Kiosk-skjermer (telefon/nettbrett) — legges til manuelt, laster
 *     /skjerm/<token> direkte. Ubegrenset antall per butikk/flate.
 *
 * Alt styres herfra. Endrer du avdeling → /skjerm oppdaterer seg selv. Pi-en
 * settes opp ÉN gang med sin URL og røres aldri igjen.
 */

export interface DisplayLite {
  displayId: number
  name: string
  online: boolean
  lastSeen: string | null
  role: "kunde" | "bakrom" | "avdeling"
  currentLayout: string | null
}

export interface ScreenRowLite {
  id: string
  token: string
  flate: Flate
  avdeling: string
  orientation: Orientation
  xibo_display_id: number | null
}

type AvdList = { key: string; label: string }[]

const SEL = "rounded-lg border border-zinc-200 px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-zinc-300"

function AssignmentControls({
  value, disabled, avdelingerKunde, avdelingerIntern, onChange,
}: {
  value: Assignment
  disabled: boolean
  avdelingerKunde: AvdList
  avdelingerIntern: AvdList
  onChange: (next: Assignment) => void
}) {
  const avdelinger = value.flate === "intern" ? avdelingerIntern : avdelingerKunde
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      <label className="block">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Flate</span>
        <select
          disabled={disabled}
          value={value.flate}
          onChange={(e) => onChange({ ...value, flate: e.target.value as Flate, avdeling: "felles" })}
          className={`${SEL} w-full mt-1`}
        >
          <option value="kunde">Kundeskjerm</option>
          <option value="intern">Internskjerm</option>
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Avdeling</span>
        <select
          disabled={disabled}
          value={value.avdeling}
          onChange={(e) => onChange({ ...value, avdeling: e.target.value })}
          className={`${SEL} w-full mt-1`}
        >
          {avdelinger.map((a) => (<option key={a.key} value={a.key}>{a.label}</option>))}
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] text-zinc-400 uppercase tracking-wide">Orientering</span>
        <select
          disabled={disabled}
          value={value.orientation}
          onChange={(e) => onChange({ ...value, orientation: e.target.value as Orientation })}
          className={`${SEL} w-full mt-1`}
        >
          <option value="portrait">Stående</option>
          <option value="landscape">Liggende</option>
        </select>
      </label>
    </div>
  )
}

function PiUrl({ origin, token }: { origin: string; token: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${origin}/skjerm/${token}`
  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }
  return (
    <div className="flex items-center gap-2 rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2">
      <span className="text-xs text-zinc-400 flex-shrink-0">Skjerm-URL</span>
      <span className="text-xs font-mono text-zinc-600 truncate flex-1">{url}</span>
      <button onClick={copy} title="Kopier" className="p-1 rounded text-zinc-400 hover:text-zinc-700">
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

function DisplayCard({
  display, row, storeId, origin, avdelingerKunde, avdelingerIntern,
}: {
  display: DisplayLite
  row: ScreenRowLite | null
  storeId: string
  origin: string
  avdelingerKunde: AvdList
  avdelingerIntern: AvdList
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [token, setToken] = useState<string | null>(row?.token ?? null)
  const [value, setValue] = useState<Assignment>({
    flate: row?.flate ?? (display.role === "kunde" ? "kunde" : "intern"),
    avdeling: row?.avdeling ?? "felles",
    orientation: row?.orientation ?? (display.role === "kunde" ? "portrait" : "landscape"),
  })

  async function apply(next: Assignment) {
    setValue(next)
    setSaving(true)
    const res = await assignDisplay(display.displayId, storeId, next)
    setSaving(false)
    if (res.ok) { if (res.token) setToken(res.token); toast.success("Skjerm oppdatert"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke lagre")
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-zinc-400 flex-shrink-0" />
        <span className="text-sm font-medium text-zinc-800 truncate flex-1">{display.name}</span>
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${display.online ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
          {display.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {display.online ? "Pålogget" : "Frakoblet"}
        </span>
        {saving && <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />}
      </div>

      <AssignmentControls
        value={value}
        disabled={saving}
        avdelingerKunde={avdelingerKunde}
        avdelingerIntern={avdelingerIntern}
        onChange={apply}
      />

      {token
        ? <PiUrl origin={origin} token={token} />
        : <p className="text-[11px] text-zinc-400">Velg flate/avdeling for å ta denne skjermen i bruk — da får den sin URL.</p>}
      {display.lastSeen && <p className="text-[11px] text-zinc-400">Sist sett: {display.lastSeen}</p>}
    </div>
  )
}

function KioskCard({
  row, origin, avdelingerKunde, avdelingerIntern,
}: {
  row: ScreenRowLite
  origin: string
  avdelingerKunde: AvdList
  avdelingerIntern: AvdList
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState<Assignment>({ flate: row.flate, avdeling: row.avdeling, orientation: row.orientation })

  async function apply(next: Assignment) {
    setValue(next)
    setSaving(true)
    const res = await setScreenAssignment(row.id, next)
    setSaving(false)
    if (res.ok) { toast.success("Skjerm oppdatert"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke lagre")
  }

  async function remove() {
    if (!confirm("Slette denne kiosk-skjermen?")) return
    setSaving(true)
    const res = await deleteScreenRow(row.id)
    setSaving(false)
    if (res.ok) { toast.success("Skjerm slettet"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke slette")
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-3 space-y-3">
      <div className="flex items-center gap-2">
        {value.flate === "intern" ? <Wrench className="w-4 h-4 text-zinc-400 flex-shrink-0" /> : <Smartphone className="w-4 h-4 text-zinc-400 flex-shrink-0" />}
        <span className="text-sm font-medium text-zinc-800 truncate flex-1">Kiosk-skjerm {value.flate === "intern" ? "(intern)" : "(kunde)"}</span>
        {saving && <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />}
        <button onClick={remove} disabled={saving} title="Slett" className="p-1 rounded text-zinc-400 hover:text-red-600 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <AssignmentControls
        value={value}
        disabled={saving}
        avdelingerKunde={avdelingerKunde}
        avdelingerIntern={avdelingerIntern}
        onChange={apply}
      />

      <PiUrl origin={origin} token={row.token} />
    </div>
  )
}

export function StoreScreens({
  storeId, displays, rows, origin,
}: {
  storeId: string
  displays: DisplayLite[]
  rows: ScreenRowLite[]
  origin: string
}) {
  const config = useTenantConfig()
  const router = useRouter()
  const [adding, setAdding] = useState<Flate | null>(null)

  const rowByDisplay = new Map<number, ScreenRowLite>()
  for (const r of rows) if (r.xibo_display_id != null) rowByDisplay.set(r.xibo_display_id, r)
  const kioskRows = rows.filter((r) => r.xibo_display_id == null)

  async function add(flate: Flate) {
    setAdding(flate)
    const res = await addKiosk(storeId, flate)
    setAdding(null)
    if (res.ok) { toast.success("Kiosk-skjerm lagt til"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke legge til")
  }

  const empty = displays.length === 0 && kioskRows.length === 0

  return (
    <div className="space-y-3">
      {empty && (
        <p className="text-sm text-zinc-500">
          Ingen skjermer ennå. Koble til en Raspberry Pi i skjermsystemet (dukker opp her automatisk),
          eller legg til en kiosk-skjerm (telefon/nettbrett) nedenfor.
        </p>
      )}

      {displays.map((d) => (
        <DisplayCard
          key={`d${d.displayId}`}
          display={d}
          row={rowByDisplay.get(d.displayId) ?? null}
          storeId={storeId}
          origin={origin}
          avdelingerKunde={config.avdelinger}
          avdelingerIntern={config.avdelingerIntern}
        />
      ))}

      {kioskRows.map((r) => (
        <KioskCard
          key={r.id}
          row={r}
          origin={origin}
          avdelingerKunde={config.avdelinger}
          avdelingerIntern={config.avdelingerIntern}
        />
      ))}

      <div className="flex flex-wrap gap-2 pt-1">
        <button onClick={() => add("kunde")} disabled={adding !== null}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 border border-dashed border-zinc-300 hover:border-zinc-400 rounded-lg px-3 py-2 disabled:opacity-50">
          {adding === "kunde" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Legg til kiosk-kundeskjerm
        </button>
        <button onClick={() => add("intern")} disabled={adding !== null}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700 border border-dashed border-zinc-300 hover:border-zinc-400 rounded-lg px-3 py-2 disabled:opacity-50">
          {adding === "intern" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Legg til kiosk-internskjerm
        </button>
      </div>
    </div>
  )
}
