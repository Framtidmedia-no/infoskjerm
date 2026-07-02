"use client"

import { useState } from "react"
import Link from "next/link"
import { Monitor, Mail, Building2, MapPin, Hash, ArrowUpRight, X, Clock, ChevronDown, PenLine } from "lucide-react"
import { cn } from "@/lib/utils"
import { TagPopover } from "./tag-popover"
import type { BoardStore, BoardTag } from "./types"
import { withAlpha } from "./types"
import {
  DAY_KEYS,
  hasConfiguredHours,
  osloClock,
  resolveDesiredPower,
  type DayKey,
  type OpeningHours,
} from "@/lib/power/schedule"

const DAY_SHORT: Record<DayKey, string> = {
  mon: "Man", tue: "Tir", wed: "Ons", thu: "Tor", fri: "Fre", sat: "Lør", sun: "Søn",
}

function transitionLabel(date: Date): string {
  const time = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }).format(date)
  const dayFmt = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "short" })
  const sameDay = dayFmt.format(date) === dayFmt.format(new Date()) && date.getTime() - Date.now() < 24 * 60 * 60 * 1000
  return sameDay ? time : `${dayFmt.format(date)} ${time}`
}

/**
 * Kompakt åpningstid-status på butikk-kortet med collapse: satt → «Åpent
 * nå / Stengt» + hele uka når man åpner; ikke satt → tydelig varsel om at
 * skjermene står alltid på, med snarvei til å sette tider på butikksiden.
 */
function OpeningHoursRow({ storeId, hours }: { storeId: string; hours: OpeningHours | null }) {
  const [open, setOpen] = useState(false)
  const configured = hasConfiguredHours(hours)
  const status = configured
    ? resolveDesiredPower({ hours, mode: "auto", leadMin: 0, lagMin: 0 })
    : null
  const todayKey = DAY_KEYS[osloClock(new Date()).day]

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Vis åpningstider"
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors hover:bg-zinc-100/70"
      >
        <Clock className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />
        {status ? (
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-zinc-600">
            <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${status.desired === "on" ? "bg-emerald-500" : "bg-zinc-400"}`} />
            <span className="truncate">
              {status.desired === "on"
                ? `Åpent nå${status.nextTransition ? ` · stenger ${transitionLabel(status.nextTransition)}` : ""}`
                : `Stengt${status.nextTransition ? ` · åpner ${transitionLabel(status.nextTransition)}` : ""}`}
            </span>
          </span>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-amber-700">
            <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-500" />
            <span className="truncate">Åpningstider ikke satt</span>
          </span>
        )}
        <ChevronDown className={`ml-auto h-3.5 w-3.5 flex-shrink-0 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-zinc-100 px-3 py-2">
          {configured ? (
            <dl className="space-y-0.5">
              {DAY_KEYS.map((key) => {
                const day = hours?.[key]
                const today = key === todayKey
                return (
                  <div key={key} className={`flex items-baseline justify-between rounded px-1 py-0.5 text-[11px] ${today ? "bg-white font-semibold text-zinc-900 ring-1 ring-zinc-200" : "text-zinc-500"}`}>
                    <dt>{DAY_SHORT[key]}{today ? " · i dag" : ""}</dt>
                    <dd className="tabular-nums">{day ? `${day.opens}–${day.closes}` : "Stengt"}</dd>
                  </div>
                )
              })}
            </dl>
          ) : (
            <p className="text-[11px] leading-relaxed text-zinc-500">
              Skjermene står alltid på til åpningstider er satt.
            </p>
          )}
          <Link
            href={`/admin/stores/${storeId}`}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:text-zinc-900"
          >
            <PenLine className="h-3 w-3" />
            {configured ? "Rediger åpningstider" : "Sett åpningstider"}
          </Link>
        </div>
      )}
    </div>
  )
}

interface StoreCardProps {
  store: BoardStore
  /** undefined = laster (streames), null = ukjent (Xibo nede), tall = fasit. */
  screenCount: number | null | undefined
  chainName: string
  chainColor: string
  tags: BoardTag[]
  allTags: BoardTag[]
  tagUsage: Record<string, number>
  onToggleTag: (tag: BoardTag, assign: boolean) => void
  onCreateTag: (name: string, color: string) => Promise<{ ok: boolean; error?: string }>
  onUpdateTag: (tag: BoardTag) => Promise<{ ok: boolean; error?: string }>
  onDeleteTag: (tagId: string) => Promise<{ ok: boolean; error?: string }>
}

export function StoreCard({
  store,
  screenCount,
  chainName,
  chainColor,
  tags,
  allTags,
  tagUsage,
  onToggleTag,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: StoreCardProps) {
  const online = (screenCount ?? 0) > 0
  const countPending = screenCount === undefined
  const [tagOpen, setTagOpen] = useState(false)

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-lg",
        tagOpen ? "z-40" : "hover:z-10"
      )}
    >
      {/* Chain accent strip */}
      <div
        className="h-1.5 w-full rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${chainColor}, ${withAlpha(chainColor, "99")})` }}
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="relative mt-1.5 flex h-2.5 w-2.5 flex-shrink-0">
              {online && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  online ? "bg-emerald-500" : countPending ? "animate-pulse bg-zinc-200" : "bg-zinc-300"
                }`}
              />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold leading-tight text-zinc-900">
                {store.name}
              </h3>
              <div className="mt-1 flex items-center gap-1 text-zinc-500">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate text-xs">{store.company_name ?? "—"}</span>
              </div>
            </div>
          </div>

          <span
            className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
            style={{
              backgroundColor: withAlpha(chainColor, "1a"),
              color: chainColor,
            }}
          >
            {chainName}
          </span>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-zinc-50/80 p-3">
          <Meta icon={<Hash className="h-3 w-3" />} label="Org.nr" value={store.org_number} mono />
          <Meta icon={<MapPin className="h-3 w-3" />} label="By" value={store.city} />
          <div className="col-span-2">
            <Meta icon={<Mail className="h-3 w-3" />} label="E-post" value={store.email} truncate />
          </div>
        </div>

        {/* Åpningstider — status + collapse (driver automatisk TV-av/på) */}
        <OpeningHoursRow storeId={store.id} hours={store.apningstider} />

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="group/tag inline-flex items-center gap-1.5 rounded-full py-1 pl-2 pr-1 text-xs font-medium text-zinc-700"
              style={{ backgroundColor: withAlpha(tag.color, "14") }}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
              <span className="max-w-[8rem] truncate">{tag.name}</span>
              <button
                type="button"
                onClick={() => onToggleTag(tag, false)}
                aria-label={`Fjern tag ${tag.name}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/5 hover:text-zinc-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <TagPopover
            assigned={tags}
            allTags={allTags}
            tagUsage={tagUsage}
            open={tagOpen}
            onOpenChange={setTagOpen}
            onToggle={onToggleTag}
            onCreate={onCreateTag}
            onUpdate={onUpdateTag}
            onDelete={onDeleteTag}
          />
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3">
          <div
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600"
            title={screenCount === null ? "Kunne ikke hente skjermstatus fra skjermsystemet" : undefined}
          >
            <Monitor className="h-3.5 w-3.5 text-zinc-400" />
            {countPending ? (
              <span className="inline-block h-3 w-14 animate-pulse rounded bg-zinc-200" aria-label="Henter skjermer…" />
            ) : screenCount === null ? (
              "– skjermer"
            ) : (
              `${screenCount} skjerm${screenCount !== 1 ? "er" : ""}`
            )}
          </div>
          <Link
            href={`/admin/stores/${store.id}`}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            Åpne
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function Meta({
  icon,
  label,
  value,
  mono,
  truncate,
}: {
  icon: React.ReactNode
  label: string
  value: string | null
  mono?: boolean
  truncate?: boolean
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
        {icon}
        {label}
      </div>
      <p
        className={`mt-0.5 text-xs text-zinc-700 ${mono ? "font-mono" : ""} ${
          truncate ? "truncate" : ""
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  )
}
