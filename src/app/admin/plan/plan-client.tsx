"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Images, Layers, Megaphone, Newspaper, Ticket } from "lucide-react"
import { TYPE_META } from "@/app/admin/innhold/_components/content-thumb"
import { cn } from "@/lib/utils"
import type { PlanData, PlanItem } from "./plan-data"

/**
 * «Planen»: horisontal tidslinje over alt planlagt innhold, én bane per flate
 * (kundeskjerm/internskjerm). Barer = gyldighetsvindu (åpen start/slutt fader
 * ut), i dag-linje, helgeskygge, hull-varsling (dager uten aktivt innhold) og
 * typelegende som filter. Ingen tidslinje-avhengigheter — ren CSS-geometri.
 */

const DAY_MS = 24 * 60 * 60 * 1000

type Zoom = "uke" | "maned" | "kvartal"
const ZOOM_DAYS: Record<Zoom, number> = { uke: 7, maned: 30, kvartal: 91 }
const ZOOM_LABELS: Record<Zoom, string> = { uke: "Uke", maned: "Måned", kvartal: "Kvartal" }

type StatusFilter = "alle" | "live" | "scheduled" | "draft"

/** Typer som ikke finnes i TYPE_META (invitasjoner bor i egen seksjon). */
const EXTRA_TYPE_META: Record<string, { label: string; icon: React.ElementType; badge: string }> = {
  invitation: { label: "Invitasjon", icon: Ticket, badge: "bg-violet-600 text-white" },
  media: { label: "Media", icon: Layers, badge: "bg-teal-600 text-white" },
  gallery: { label: "Galleri", icon: Images, badge: "bg-teal-600 text-white" },
}

function typeMeta(type: string): { label: string; icon: React.ElementType; badge: string } {
  return TYPE_META[type] ?? EXTRA_TYPE_META[type] ?? { label: type, icon: Newspaper, badge: "bg-zinc-500 text-white" }
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function parseDay(iso: string): Date {
  return startOfDay(new Date(iso))
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS)
}

function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  return Math.ceil(((t.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7)
}

const fmtDay = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" })
const fmtWeekday = new Intl.DateTimeFormat("nb-NO", { weekday: "short" })
const fmtLong = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "long" })

interface Geometry {
  windowStart: Date
  days: number
}

/** Posisjon i prosent for et tidspunkt innenfor vinduet. */
function pctOf(date: Date, geo: Geometry): number {
  return ((date.getTime() - geo.windowStart.getTime()) / (geo.days * DAY_MS)) * 100
}

interface BarGeo {
  leftPct: number
  widthPct: number
  openStart: boolean
  openEnd: boolean
  visible: boolean
}

function barGeometry(item: PlanItem, geo: Geometry): BarGeo {
  const windowEnd = addDays(geo.windowStart, geo.days)
  const start = item.start ? parseDay(item.start) : null
  // Slutt er inklusiv hele dagen → +1 døgn i geometri.
  const end = item.end ? addDays(parseDay(item.end), 1) : null
  const s = start ?? addDays(geo.windowStart, -1)
  const e = end ?? addDays(windowEnd, 1)
  if (e <= geo.windowStart || s >= windowEnd) {
    return { leftPct: 0, widthPct: 0, openStart: false, openEnd: false, visible: false }
  }
  const leftPct = Math.max(0, pctOf(s, geo))
  const rightPct = Math.min(100, pctOf(e, geo))
  return {
    leftPct,
    widthPct: Math.max(rightPct - leftPct, 1.2),
    openStart: !start || s < geo.windowStart,
    openEnd: !end || e > windowEnd,
    visible: true,
  }
}

/** Dekker elementet (live/planlagt) en gitt dag? Brukes til hull-varsling. */
function coversDay(item: PlanItem, day: Date): boolean {
  if (item.status !== "live" && item.status !== "scheduled") return false
  if (item.start && parseDay(item.start) > day) return false
  if (item.end && parseDay(item.end) < day) return false
  return true
}

function Bar({ item, geo, today }: { item: PlanItem; geo: Geometry; today: Date }) {
  const g = barGeometry(item, geo)
  if (!g.visible) return null
  const meta = typeMeta(item.type)
  const Icon = meta.icon
  const isDraft = item.status === "draft"
  const isScheduled = item.status === "scheduled"
  const expired = item.status === "live" && item.end !== null && parseDay(item.end) < today

  const markers: Array<{ pct: number; title: string; kind: "event" | "deadline" }> = []
  for (const [value, kind, label] of [
    [item.eventDate, "event", "Arrangement"],
    [item.signupDeadline, "deadline", "Påmeldingsfrist"],
  ] as const) {
    if (!value) continue
    const d = parseDay(value)
    const pct = pctOf(addDays(d, 0.5), geo)
    if (pct >= 0 && pct <= 100) markers.push({ pct, title: `${label} ${fmtLong.format(d)}`, kind })
  }

  const mask =
    g.openStart && g.openEnd
      ? "linear-gradient(90deg, transparent, black 14px, black calc(100% - 14px), transparent)"
      : g.openStart
        ? "linear-gradient(90deg, transparent, black 14px)"
        : g.openEnd
          ? "linear-gradient(90deg, black calc(100% - 14px), transparent)"
          : undefined

  return (
    <div className="relative h-8">
      <Link
        href={item.editHref}
        title={`${meta.label}: ${item.title} · ${item.targetLabel}${expired ? " · UTLØPT" : ""}`}
        className={cn(
          "group absolute inset-y-0.5 flex items-center gap-1.5 overflow-hidden px-2 text-xs font-medium transition-all hover:z-20 hover:-translate-y-px hover:shadow-lg",
          g.openStart ? "rounded-l-sm" : "rounded-l-lg",
          g.openEnd ? "rounded-r-sm" : "rounded-r-lg",
          isDraft
            ? "border-2 border-dashed border-zinc-300 bg-white text-zinc-500"
            : cn(meta.badge, expired && "opacity-45 saturate-50")
        )}
        style={{
          left: `${g.leftPct}%`,
          width: `${g.widthPct}%`,
          ...(isScheduled
            ? { backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.22) 0 6px, transparent 6px 12px)" }
            : undefined),
          ...(mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined),
        }}
      >
        <Icon className="h-3 w-3 flex-shrink-0 opacity-90" />
        <span className="truncate">{item.title}</span>
        {item.inBothLanes && <Layers className="h-3 w-3 flex-shrink-0 opacity-70" aria-label="Vises på begge flater" />}
      </Link>
      {markers.map((m) => (
        <span
          key={m.kind}
          title={m.title}
          className={cn(
            "absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2",
            m.kind === "event"
              ? "h-2.5 w-2.5 rotate-45 rounded-[2px] bg-white ring-2 ring-violet-600"
              : "h-2.5 w-2.5 rounded-full border-2 border-amber-500 bg-white"
          )}
          style={{ left: `${m.pct}%` }}
        />
      ))}
    </div>
  )
}

function Lane({
  title,
  icon: LaneIcon,
  items,
  geo,
  today,
  delay,
}: {
  title: string
  icon: React.ElementType
  items: PlanItem[]
  geo: Geometry
  today: Date
  delay: number
}) {
  const visible = items.filter((i) => barGeometry(i, geo).visible)
  const windowDays = Array.from({ length: geo.days }, (_, i) => addDays(geo.windowStart, i))

  // Hull: dager i vinduet uten ett eneste aktivt (live/planlagt) element.
  const gapDays = windowDays.filter((day) => day >= today && !items.some((i) => coversDay(i, day)))
  const gapSet = new Set(gapDays.map((d) => d.getTime()))

  const todayPct = pctOf(addDays(today, 0.5), geo)
  const todayVisible = todayPct >= 0 && todayPct <= 100

  return (
    <section
      className="fx-rise overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_2px_8px_-2px_rgba(16,24,40,0.06)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex flex-wrap items-center gap-2.5 border-b border-zinc-100 px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white">
          <LaneIcon className="h-4 w-4" />
        </span>
        <h2 className="font-display text-sm font-semibold tracking-tight text-zinc-900">{title}</h2>
        <span className="text-xs text-zinc-400">{visible.length} i vinduet</span>
        {gapDays.length > 0 && (
          <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
            {gapDays.length} {gapDays.length === 1 ? "dag" : "dager"} uten innhold
          </span>
        )}
      </header>

      <div className="relative px-4 py-3">
        {/* Helgeskygge + hull-stripe + i dag-linje bak barene */}
        <div aria-hidden className="pointer-events-none absolute inset-x-4 inset-y-0">
          {windowDays.map((day, i) => {
            const wd = day.getDay()
            const isWeekend = wd === 0 || wd === 6
            const isGap = gapSet.has(day.getTime())
            if (!isWeekend && !isGap) return null
            return (
              <span
                key={i}
                className={cn("absolute inset-y-0", isGap ? "bg-amber-100/70" : "bg-zinc-100/70")}
                style={{ left: `${(i / geo.days) * 100}%`, width: `${100 / geo.days}%` }}
              />
            )
          })}
          {todayVisible && (
            <span className="absolute inset-y-0 z-10 w-px bg-red-500" style={{ left: `${todayPct}%` }}>
              <span className="absolute -top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-500" />
            </span>
          )}
        </div>

        {visible.length === 0 ? (
          <p className="relative py-6 text-center text-sm text-zinc-400">Ingenting planlagt i dette vinduet.</p>
        ) : (
          <div className="relative space-y-1">
            {visible.map((item) => (
              <Bar key={item.id} item={item} geo={geo} today={today} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function PlanClient({ data }: { data: PlanData }) {
  // Dato-avhengig geometri først etter mount (unngår SSR/klient-avvik).
  const [today, setToday] = useState<Date | null>(null)
  const [zoom, setZoom] = useState<Zoom>("maned")
  const [offset, setOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("alle")
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set())

  useEffect(() => {
    setToday(startOfDay(new Date()))
  }, [])

  const allTypes = useMemo(() => {
    const set = new Set<string>()
    for (const item of [...data.kunde, ...data.intern]) set.add(item.type)
    return [...set].sort((a, b) => typeMeta(a).label.localeCompare(typeMeta(b).label, "nb"))
  }, [data])

  if (!today) {
    return <div className="p-4 sm:p-6"><div className="h-64 animate-pulse rounded-2xl bg-zinc-100" /></div>
  }

  const days = ZOOM_DAYS[zoom]
  // Vinduet starter litt før i dag så pågående innhold har kontekst.
  const geo: Geometry = { windowStart: addDays(today, offset * days - Math.min(3, Math.floor(days / 7))), days }
  const windowEnd = addDays(geo.windowStart, days - 1)

  const matches = (item: PlanItem) =>
    !hiddenTypes.has(item.type) && (statusFilter === "alle" || item.status === statusFilter)
  const kunde = data.kunde.filter(matches)
  const intern = data.intern.filter(matches)

  const windowDays = Array.from({ length: days }, (_, i) => addDays(geo.windowStart, i))
  const tickEvery = zoom === "uke" ? 1 : zoom === "maned" ? 2 : 7

  const toggleType = (t: string) =>
    setHiddenTypes((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Kontroller */}
      <div className="fx-rise flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-zinc-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          {(Object.keys(ZOOM_DAYS) as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => { setZoom(z); setOffset(0) }}
              className={cn(
                "rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-all",
                zoom === z ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          <button onClick={() => setOffset((o) => o - 1)} aria-label="Forrige periode" className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setOffset(0)}
            className={cn("rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors", offset === 0 ? "text-zinc-900" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900")}
          >
            I dag
          </button>
          <button onClick={() => setOffset((o) => o + 1)} aria-label="Neste periode" className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <span className="text-sm font-medium text-zinc-600">
          {fmtDay.format(geo.windowStart)} – {fmtDay.format(windowEnd)}
        </span>

        <div className="ml-auto flex rounded-xl border border-zinc-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          {([["alle", "Alle"], ["live", "Live"], ["scheduled", "Planlagt"], ["draft", "Utkast"]] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "rounded-[10px] px-2.5 py-1.5 text-xs font-semibold transition-all",
                statusFilter === value ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-900"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Typelegende = filter */}
      <div className="fx-rise flex flex-wrap items-center gap-1.5" style={{ animationDelay: "60ms" }}>
        {allTypes.map((t) => {
          const meta = typeMeta(t)
          const Icon = meta.icon
          const hidden = hiddenTypes.has(t)
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              title={hidden ? `Vis ${meta.label}` : `Skjul ${meta.label}`}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all",
                hidden ? "bg-zinc-100 text-zinc-400 line-through" : meta.badge
              )}
            >
              <Icon className="h-3 w-3" />
              {meta.label}
            </button>
          )
        })}
        <span className="ml-1 text-[11px] text-zinc-400">Klikk for å filtrere · ◆ arrangement · ○ frist</span>
      </div>

      {/* Dato-akse — mx-4 matcher banenes indre padding så prosentene treffer */}
      <div className="fx-rise relative mx-4 flex h-6 items-end" style={{ animationDelay: "90ms" }}>
        {windowDays.map((day, i) => {
          if (zoom === "kvartal" ? day.getDay() !== 1 : i % tickEvery !== 0) return null
          return (
            <span
              key={i}
              className={cn("absolute bottom-0 text-[10px] tabular-nums", day.getTime() === today.getTime() ? "font-bold text-red-500" : "text-zinc-400")}
              style={{ left: `${(i / days) * 100}%` }}
            >
              {zoom === "uke" ? `${fmtWeekday.format(day)} ${day.getDate()}.` : zoom === "kvartal" ? `u${isoWeek(day)}` : `${day.getDate()}.`}
              {(day.getDate() === 1 || i === 0) && <span className="ml-1 font-semibold text-zinc-600">{fmtDay.format(day).split(" ")[1]}</span>}
            </span>
          )
        })}
      </div>

      <Lane title="Kundeskjerm" icon={Megaphone} items={kunde} geo={geo} today={today} delay={120} />
      <Lane title="Internskjerm" icon={Newspaper} items={intern} geo={geo} today={today} delay={180} />

      <p className="text-center text-[11px] text-zinc-400">
        Barer viser gyldighetsvinduet — åpne ender fader ut. Skraverte barer er planlagte, stiplede er utkast. Gule felter = dager uten aktivt innhold.
      </p>
    </div>
  )
}
