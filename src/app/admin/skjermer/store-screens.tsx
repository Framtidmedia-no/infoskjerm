"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Monitor, Wrench, Copy, Check, Plus, Trash2, Loader2, Smartphone, Wifi, WifiOff } from "lucide-react"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { ScreenPowerControls, type ScreenPowerInfo } from "./power-controls"
import type { OpeningHours } from "@/lib/power/schedule"
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

export interface ScreenRowLite extends ScreenPowerInfo {
  id: string
  token: string
  flate: Flate
  avdeling: string
  orientation: Orientation
  xibo_display_id: number | null
}

type AvdList = { key: string; label: string }[]

const SEL =
  "rounded-xl border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-sm font-medium text-zinc-800 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors focus:border-[var(--brand-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 hover:border-zinc-300"

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

/**
 * Levende tvilling: nedskalert iframe av selve spillersiden (/skjerm/<token>)
 * i en mørk bezel med brand-glød — kortet viser hva skjermen faktisk spiller
 * akkurat nå. Lazy (IntersectionObserver) så lister med mange skjermer ikke
 * laster alle spillerne samtidig.
 */
function ScreenTwin({ token, orientation, online }: { token: string; orientation: Orientation; online: boolean | null }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  const [visible, setVisible] = useState(false)
  const portrait = orientation === "portrait"
  const W = portrait ? 1080 : 1920
  const H = portrait ? 1920 : 1080

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W))
    ro.observe(el)
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) setVisible(true)
    }, { rootMargin: "150px" })
    io.observe(el)
    return () => { ro.disconnect(); io.disconnect() }
  }, [W])

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0b101c] p-2.5">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
        style={{ background: "radial-gradient(70% 100% at 50% 0%, color-mix(in oklab, var(--brand-primary) 20%, transparent), transparent 75%)" }}
      />
      <div
        ref={wrapRef}
        className={`relative mx-auto overflow-hidden rounded-lg bg-black ring-1 ring-white/10 ${portrait ? "w-[118px]" : "w-full"}`}
        style={{ aspectRatio: portrait ? "9 / 16" : "16 / 9", boxShadow: "0 0 44px -12px color-mix(in oklab, var(--brand-primary) 55%, transparent)" }}
      >
        {visible && scale > 0 && (
          <iframe
            title="Direkte forhåndsvisning av skjermen"
            src={`/skjerm/${token}`}
            scrolling="no"
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 border-0"
            style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: "top left" }}
          />
        )}
      </div>
      {online != null && (
        <span className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${online ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-400/30" : "bg-white/10 text-zinc-400 ring-1 ring-inset ring-white/15"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${online ? "animate-pulse bg-emerald-400" : "bg-zinc-500"}`} />
          {online ? "Direkte" : "Frakoblet"}
        </span>
      )}
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
  display, row, storeId, origin, avdelingerKunde, avdelingerIntern, apningstider,
}: {
  display: DisplayLite
  row: ScreenRowLite | null
  storeId: string
  origin: string
  avdelingerKunde: AvdList
  avdelingerIntern: AvdList
  apningstider: OpeningHours | null
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
    <div className="space-y-3 rounded-2xl border border-zinc-200/80 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_6px_20px_-8px_rgba(16,24,40,0.14)]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100">
          <Monitor className="w-4 h-4 text-zinc-500" />
        </span>
        <span className="font-display text-sm font-semibold tracking-tight text-zinc-900 truncate flex-1">{display.name}</span>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${display.online ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-red-50 text-red-500 ring-1 ring-red-100"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${display.online ? "animate-pulse bg-emerald-500" : "bg-red-400"}`} />
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

      {row && (
        <ScreenPowerControls screenId={row.id} power={row} hours={apningstider} isPi />
      )}

      {token && <ScreenTwin token={token} orientation={value.orientation} online={display.online} />}
      {token
        ? <PiUrl origin={origin} token={token} />
        : <p className="text-[11px] text-zinc-400">Velg flate/avdeling for å ta denne skjermen i bruk — da får den sin URL.</p>}
      {display.lastSeen && <p className="text-[11px] text-zinc-400">Sist sett: {display.lastSeen}</p>}
    </div>
  )
}

function KioskCard({
  row, origin, avdelingerKunde, avdelingerIntern, apningstider,
}: {
  row: ScreenRowLite
  origin: string
  avdelingerKunde: AvdList
  avdelingerIntern: AvdList
  apningstider: OpeningHours | null
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
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
    setSaving(true)
    const res = await deleteScreenRow(row.id)
    setSaving(false)
    if (res.ok) { toast.success("Skjerm slettet"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke slette")
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200/80 p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-shadow hover:shadow-[0_6px_20px_-8px_rgba(16,24,40,0.14)]">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100">
          {value.flate === "intern" ? <Wrench className="w-4 h-4 text-zinc-500" /> : <Smartphone className="w-4 h-4 text-zinc-500" />}
        </span>
        <span className="font-display text-sm font-semibold tracking-tight text-zinc-900 truncate flex-1">Kiosk-skjerm {value.flate === "intern" ? "(intern)" : "(kunde)"}</span>
        {saving && <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />}
        <button onClick={() => setConfirmOpen(true)} disabled={saving} title="Slett" aria-label="Slett kiosk-skjerm" className="p-1 rounded text-zinc-400 hover:text-red-600 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Slett kiosk-skjerm"
          description="Skjermen slutter å vise innhold umiddelbart, og lenken blir ugyldig. Dette kan ikke angres."
          confirmLabel="Slett skjerm"
          destructive
          onConfirm={remove}
        />
      </div>

      <AssignmentControls
        value={value}
        disabled={saving}
        avdelingerKunde={avdelingerKunde}
        avdelingerIntern={avdelingerIntern}
        onChange={apply}
      />

      <ScreenPowerControls screenId={row.id} power={row} hours={apningstider} isPi={false} />

      <ScreenTwin token={row.token} orientation={value.orientation} online={null} />
      <PiUrl origin={origin} token={row.token} />
    </div>
  )
}

export function StoreScreens({
  storeId, displays, rows, origin, apningstider = null,
}: {
  storeId: string
  displays: DisplayLite[]
  rows: ScreenRowLite[]
  origin: string
  apningstider?: OpeningHours | null
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
          apningstider={apningstider}
        />
      ))}

      {kioskRows.map((r) => (
        <KioskCard
          key={r.id}
          row={r}
          origin={origin}
          avdelingerKunde={config.avdelinger}
          avdelingerIntern={config.avdelingerIntern}
          apningstider={apningstider}
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
