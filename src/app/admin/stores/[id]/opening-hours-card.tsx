"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Clock, Copy, Loader2, Save, MonitorOff } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { updateStoreApningstider } from "../actions"
import {
  DAY_KEYS,
  resolveDesiredPower,
  hasConfiguredHours,
  parseHm,
  type DayKey,
  type OpeningHours,
} from "@/lib/power/schedule"

/**
 * Åpningstider per butikk — driver automatisk TV-av/på (HDMI-CEC via Pi-agenten)
 * og kiosk-hvilevisningen. Én rad per ukedag med åpen/stengt-toggle og tider,
 * pluss live «Åpent nå»-status så det er lett å se at planen stemmer.
 */

const DAY_LABELS: Record<DayKey, string> = {
  mon: "Mandag",
  tue: "Tirsdag",
  wed: "Onsdag",
  thu: "Torsdag",
  fri: "Fredag",
  sat: "Lørdag",
  sun: "Søndag",
}

interface DayState {
  open: boolean
  opens: string
  closes: string
}

type HoursState = Record<DayKey, DayState>

// Forslag når butikken aldri har satt tider: typisk norsk dagligvare.
const SUGGESTION: HoursState = {
  mon: { open: true, opens: "07:00", closes: "23:00" },
  tue: { open: true, opens: "07:00", closes: "23:00" },
  wed: { open: true, opens: "07:00", closes: "23:00" },
  thu: { open: true, opens: "07:00", closes: "23:00" },
  fri: { open: true, opens: "07:00", closes: "23:00" },
  sat: { open: true, opens: "08:00", closes: "21:00" },
  sun: { open: false, opens: "10:00", closes: "18:00" },
}

function fromHours(hours: OpeningHours | null): HoursState {
  if (!hasConfiguredHours(hours)) return SUGGESTION
  const state = {} as HoursState
  for (const key of DAY_KEYS) {
    const day = hours?.[key]
    state[key] = day
      ? { open: true, opens: day.opens, closes: day.closes }
      : { open: false, opens: SUGGESTION[key].opens, closes: SUGGESTION[key].closes }
  }
  return state
}

function toHours(state: HoursState): OpeningHours {
  const out: OpeningHours = {}
  for (const key of DAY_KEYS) {
    out[key] = state[key].open ? { opens: state[key].opens, closes: state[key].closes } : null
  }
  return out
}

/** Klokkeslett i Oslo + ukedag-prefiks når overgangen ikke er i dag. */
export function formatTransition(date: Date): string {
  const time = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }).format(date)
  const dayFmt = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "long" })
  const today = dayFmt.format(new Date())
  const target = dayFmt.format(date)
  if (target === today && date.getTime() - Date.now() < 24 * 60 * 60 * 1000) return time
  return `${target} ${time}`
}

export function OpeningHoursCard({ storeId, initial }: { storeId: string; initial: OpeningHours | null }) {
  const router = useRouter()
  const configured = hasConfiguredHours(initial)
  const [state, setState] = useState<HoursState>(() => fromHours(initial))
  const [saving, setSaving] = useState(false)
  // null = aldri lagret (ukonfigurert) — da skal forslaget kunne lagres direkte.
  const [savedState, setSavedState] = useState<HoursState | null>(() => (configured ? fromHours(initial) : null))

  const dirty = useMemo(() => savedState === null || JSON.stringify(state) !== JSON.stringify(savedState), [state, savedState])

  const invalidDays = DAY_KEYS.filter(
    (k) => state[k].open && (parseHm(state[k].opens) == null || parseHm(state[k].closes) == null),
  )

  // Live-status regnet på LAGREDE tider — chippen skal vise virkeligheten, ikke utkastet.
  const status = useMemo(() => {
    if (!configured) return null
    return resolveDesiredPower({ hours: initial, mode: "auto", leadMin: 0, lagMin: 0 })
  }, [configured, initial])

  function setDay(key: DayKey, patch: Partial<DayState>) {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function copyToAllOpen(source: DayKey) {
    const { opens, closes } = state[source]
    setState((prev) => {
      const next = { ...prev }
      for (const key of DAY_KEYS) {
        if (next[key].open) next[key] = { ...next[key], opens, closes }
      }
      return next
    })
    toast.success(`${DAY_LABELS[source]}s tider kopiert til alle åpne dager`)
  }

  async function save() {
    if (saving || !dirty || invalidDays.length > 0) return
    setSaving(true)
    const res = await updateStoreApningstider(storeId, toHours(state))
    setSaving(false)
    if (res.ok) {
      setSavedState(state)
      toast.success("Åpningstider lagret — skjermene følger den nye planen")
      router.refresh()
    } else {
      toast.error(res.error ?? "Kunne ikke lagre åpningstider")
    }
  }

  const timeField =
    "rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm font-mono tabular-nums text-zinc-800 transition-colors focus:border-[var(--brand-primary)] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15 disabled:opacity-40"

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Clock className="w-4 h-4 text-zinc-500" />
          <h2 className="font-semibold text-zinc-900">Åpningstider</h2>
          {status && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                status.desired === "on"
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${status.desired === "on" ? "animate-pulse bg-emerald-500" : "bg-zinc-400"}`} />
              {status.desired === "on"
                ? `Åpent nå${status.nextTransition ? ` · stenger ${formatTransition(status.nextTransition)}` : ""}`
                : `Stengt${status.nextTransition ? ` · åpner ${formatTransition(status.nextTransition)}` : ""}`}
            </span>
          )}
          <div className="flex-1" />
          <button
            onClick={save}
            disabled={!dirty || saving || invalidDays.length > 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {dirty ? "Lagre åpningstider" : "Lagret"}
          </button>
        </div>

        {!configured && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <MonitorOff className="mt-0.5 w-4 h-4 flex-shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              <strong>Ikke satt opp ennå — skjermene står alltid på.</strong> Forslaget under er
              typiske tider; juster og lagre, så slår skjermene seg av og på automatisk rundt åpningstid.
            </p>
          </div>
        )}

        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200/80">
          {DAY_KEYS.map((key) => {
            const day = state[key]
            const invalid = invalidDays.includes(key)
            return (
              <div key={key} className={`flex flex-wrap items-center gap-3 px-3.5 py-2.5 ${day.open ? "" : "bg-zinc-50/60"}`}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={day.open}
                  aria-label={`${DAY_LABELS[key]} ${day.open ? "åpen" : "stengt"}`}
                  onClick={() => setDay(key, { open: !day.open })}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${day.open ? "bg-emerald-500" : "bg-zinc-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${day.open ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                </button>
                <span className={`w-20 text-sm font-medium ${day.open ? "text-zinc-900" : "text-zinc-400"}`}>{DAY_LABELS[key]}</span>

                {day.open ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={day.opens}
                      onChange={(e) => setDay(key, { opens: e.target.value })}
                      className={`${timeField} ${invalid ? "border-red-300" : ""}`}
                      aria-label={`${DAY_LABELS[key]} åpner`}
                    />
                    <span className="text-xs text-zinc-400">–</span>
                    <input
                      type="time"
                      value={day.closes}
                      onChange={(e) => setDay(key, { closes: e.target.value })}
                      className={`${timeField} ${invalid ? "border-red-300" : ""}`}
                      aria-label={`${DAY_LABELS[key]} stenger`}
                    />
                    <button
                      type="button"
                      onClick={() => copyToAllOpen(key)}
                      title="Bruk denne tiden på alle åpne dager"
                      aria-label={`Kopier ${DAY_LABELS[key]}s tider til alle åpne dager`}
                      className="rounded p-1 text-zinc-300 transition-colors hover:text-zinc-600"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">Stengt</span>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-[11px] leading-relaxed text-zinc-400">
          Skjermer med strømmodus «Følger åpningstider» slår seg på litt før åpning og av litt etter
          stenging (justeres per skjerm under Skjermer). Stengte dager holder skjermene av hele dagen.
        </p>
      </CardContent>
    </Card>
  )
}
