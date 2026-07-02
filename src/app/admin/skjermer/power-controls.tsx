"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarClock, Loader2, Power, PowerOff, Undo2, Zap } from "lucide-react"
import {
  resolveDesiredPower,
  hasConfiguredHours,
  type OpeningHours,
  type PowerMode,
  type PowerValue,
} from "@/lib/power/schedule"
import { setScreenPowerMode, setScreenPowerMargins, overrideScreenPower, clearScreenPowerOverride } from "./actions"

/**
 * Strømstyring per skjerm: modus (følg åpningstider / alltid på), manuell
 * av/på-overstyring og TV-status rapportert fra Pi-agenten. Statuslinjen regnes
 * med samme beregning som serveren bruker — det admin ser er det Pi-en gjør.
 */

export interface ScreenPowerInfo {
  power_mode: string | null
  power_on_lead_min: number | null
  power_off_lag_min: number | null
  power_override: string | null
  power_override_until: string | null
  power_state: string | null
  power_state_at: string | null
}

function osloTime(date: Date): string {
  const time = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }).format(date)
  const dayFmt = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "short" })
  const sameDay = dayFmt.format(date) === dayFmt.format(new Date()) && date.getTime() - Date.now() < 24 * 60 * 60 * 1000
  return sameDay ? time : `${dayFmt.format(date)} ${time}`
}

export function ScreenPowerControls({
  screenId,
  power,
  hours,
  isPi,
}: {
  screenId: string
  power: ScreenPowerInfo
  hours: OpeningHours | null
  isPi: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<"mode" | "override" | "clear" | "margin" | null>(null)

  const mode: PowerMode = power.power_mode === "always_on" ? "always_on" : "auto"
  const leadMin = power.power_on_lead_min ?? 15
  const lagMin = power.power_off_lag_min ?? 15
  const [leadDraft, setLeadDraft] = useState(String(leadMin))
  const [lagDraft, setLagDraft] = useState(String(lagMin))
  const configured = hasConfiguredHours(hours)

  const decision = useMemo(
    () =>
      resolveDesiredPower({
        hours,
        mode,
        leadMin,
        lagMin,
        override: power.power_override === "on" || power.power_override === "off" ? (power.power_override as PowerValue) : null,
        overrideUntil: power.power_override_until,
      }),
    [hours, mode, leadMin, lagMin, power.power_override, power.power_override_until],
  )

  const statusText = useMemo(() => {
    if (decision.reason === "always_on") return "Alltid på — slår aldri av automatisk"
    if (decision.reason === "override") {
      const until = decision.nextTransition ? ` til ${osloTime(decision.nextTransition)}` : ""
      return decision.desired === "on" ? `Manuelt på${until}` : `Manuelt av${until}`
    }
    if (decision.reason === "no_hours") return "Åpningstider ikke satt — står alltid på"
    const next = decision.nextTransition ? osloTime(decision.nextTransition) : null
    return decision.desired === "on"
      ? next ? `På — slår av ${next}` : "På"
      : next ? `Av — slår på ${next}` : "Av"
  }, [decision])

  async function changeMode(next: PowerMode) {
    if (busy || next === mode) return
    setBusy("mode")
    const res = await setScreenPowerMode(screenId, next)
    setBusy(null)
    if (res.ok) { toast.success(next === "auto" ? "Skjermen følger åpningstidene" : "Skjermen står alltid på"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke endre strømmodus")
  }

  async function doOverride(value: PowerValue) {
    if (busy) return
    setBusy("override")
    const res = await overrideScreenPower(screenId, value)
    setBusy(null)
    if (res.ok) {
      toast.success(value === "on" ? "Skjermen slås på (innen ett minutt)" : "Skjermen slås av (innen ett minutt)")
      router.refresh()
    } else toast.error(res.error ?? "Kunne ikke overstyre")
  }

  // Slingring (min før åpning / etter stenging) lagres på blur når verdien er
  // endret — alt styres herfra, Pi-en trenger aldri re-provisjonering.
  async function saveMargins() {
    const lead = Math.min(180, Math.max(0, Math.round(Number(leadDraft)) || 0))
    const lag = Math.min(180, Math.max(0, Math.round(Number(lagDraft)) || 0))
    setLeadDraft(String(lead))
    setLagDraft(String(lag))
    if (busy || (lead === leadMin && lag === lagMin)) return
    setBusy("margin")
    const res = await setScreenPowerMargins(screenId, lead, lag)
    setBusy(null)
    if (res.ok) { toast.success(`Slår på ${lead} min før åpning, av ${lag} min etter stenging`); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke lagre slingring")
  }

  async function clearOverride() {
    if (busy) return
    setBusy("clear")
    const res = await clearScreenPowerOverride(screenId)
    setBusy(null)
    if (res.ok) { toast.success("Følger planen igjen"); router.refresh() }
    else toast.error(res.error ?? "Kunne ikke fjerne overstyring")
  }

  const overrideActive = decision.reason === "override"
  const tvKnown = isPi && power.power_state_at && (power.power_state === "on" || power.power_state === "off")

  const segBtn = (active: boolean) =>
    `rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
      active ? "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200" : "text-zinc-500 hover:text-zinc-800"
    }`

  return (
    <div className="space-y-2.5 rounded-xl border border-zinc-200/80 bg-zinc-50/60 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          <Zap className="w-3.5 h-3.5" /> Strøm
        </span>

        <div className="inline-flex rounded-lg bg-zinc-100 p-0.5" role="radiogroup" aria-label="Strømmodus">
          <button role="radio" aria-checked={mode === "auto"} disabled={busy !== null} onClick={() => changeMode("auto")} className={segBtn(mode === "auto")}>
            Følger åpningstider
          </button>
          <button role="radio" aria-checked={mode === "always_on"} disabled={busy !== null} onClick={() => changeMode("always_on")} className={segBtn(mode === "always_on")}>
            Alltid på
          </button>
        </div>

        {busy === "mode" && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
        <div className="flex-1" />

        {tvKnown && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              power.power_state === "on"
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200"
            }`}
            title={`Rapportert av Pi-agenten ${osloTime(new Date(power.power_state_at as string))}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${power.power_state === "on" ? "bg-emerald-500" : "bg-zinc-400"}`} />
            TV {power.power_state === "on" ? "på" : "av"}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs ${decision.desired === "on" ? "text-zinc-600" : "text-zinc-500"}`}>
          <CalendarClock className="w-3.5 h-3.5 text-zinc-400" />
          {statusText}
        </span>
        <div className="flex-1" />

        {overrideActive ? (
          <button
            onClick={clearOverride}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:opacity-50"
          >
            {busy === "clear" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
            Følg plan igjen
          </button>
        ) : decision.desired === "on" ? (
          <button
            onClick={() => doOverride("off")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition-colors hover:border-zinc-400 disabled:opacity-50"
          >
            {busy === "override" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PowerOff className="w-3.5 h-3.5" />}
            Slå av nå
          </button>
        ) : (
          <button
            onClick={() => doOverride("on")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy === "override" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
            Slå på nå
          </button>
        )}
      </div>

      {mode === "auto" && configured && (
        <p className="flex flex-wrap items-center gap-1 text-[10px] leading-relaxed text-zinc-400">
          Slår på
          <input
            type="number" min={0} max={180} value={leadDraft}
            onChange={(e) => setLeadDraft(e.target.value)}
            onBlur={saveMargins}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            disabled={busy !== null && busy !== "margin"}
            aria-label="Minutter på før åpning"
            className="w-12 rounded border border-zinc-200 bg-white px-1 py-0.5 text-center text-[10px] tabular-nums text-zinc-600 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/20"
          />
          min før åpning og av
          <input
            type="number" min={0} max={180} value={lagDraft}
            onChange={(e) => setLagDraft(e.target.value)}
            onBlur={saveMargins}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur() }}
            disabled={busy !== null && busy !== "margin"}
            aria-label="Minutter på etter stenging"
            className="w-12 rounded border border-zinc-200 bg-white px-1 py-0.5 text-center text-[10px] tabular-nums text-zinc-600 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)]/20"
          />
          min etter stenging.
          {busy === "margin" && <Loader2 className="w-3 h-3 animate-spin text-zinc-400" />}
          {!isPi && <span>Kiosk-skjermer viser svart hvilevisning når de er «av».</span>}
        </p>
      )}
    </div>
  )
}
