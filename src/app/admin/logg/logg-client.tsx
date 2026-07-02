"use client"

import { useMemo, useState } from "react"
import { LogIn, FilePlus, FileEdit, Send, EyeOff, Trash2, Copy, CalendarPlus, UserPlus, Shield, Store, Tag, Palette, Monitor, Search, Activity, Zap } from "lucide-react"
import { CountUp } from "@/components/ui/count-up"
import { Sparkline } from "@/components/ui/sparkline"

export interface LogRow {
  id: string
  created_at: string
  user_email: string | null
  action: string
  entity_type: string | null
  summary: string
}

const ACTION_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  "auth.login": { label: "Innlogging", icon: LogIn, cls: "bg-sky-50 text-sky-700" },
  "content.create": { label: "Opprettet", icon: FilePlus, cls: "bg-zinc-100 text-zinc-700" },
  "content.update": { label: "Endret", icon: FileEdit, cls: "bg-amber-50 text-amber-700" },
  "content.publish": { label: "Publisert", icon: Send, cls: "bg-emerald-50 text-emerald-700" },
  "content.unpublish": { label: "Avpublisert", icon: EyeOff, cls: "bg-zinc-100 text-zinc-600" },
  "content.delete": { label: "Slettet", icon: Trash2, cls: "bg-red-50 text-red-700" },
  "content.duplicate": { label: "Kopiert", icon: Copy, cls: "bg-zinc-100 text-zinc-700" },
  "content.extend": { label: "Forlenget", icon: CalendarPlus, cls: "bg-amber-50 text-amber-700" },
  "user.invite": { label: "Invitert", icon: UserPlus, cls: "bg-indigo-50 text-indigo-700" },
  "user.delete": { label: "Bruker slettet", icon: Trash2, cls: "bg-red-50 text-red-700" },
  "user.role": { label: "Rolle endret", icon: Shield, cls: "bg-indigo-50 text-indigo-700" },
  "user.stores": { label: "Tilgang endret", icon: Shield, cls: "bg-indigo-50 text-indigo-700" },
  "store.create": { label: "Butikk opprettet", icon: Store, cls: "bg-zinc-100 text-zinc-700" },
  "store.delete": { label: "Butikk slettet", icon: Trash2, cls: "bg-red-50 text-red-700" },
  "tag.create": { label: "Tagg opprettet", icon: Tag, cls: "bg-zinc-100 text-zinc-700" },
  "settings.branding": { label: "Merkevare", icon: Palette, cls: "bg-fuchsia-50 text-fuchsia-700" },
  "settings.logo": { label: "Logo", icon: Palette, cls: "bg-fuchsia-50 text-fuchsia-700" },
  "screen.create": { label: "Skjerm opprettet", icon: Monitor, cls: "bg-zinc-100 text-zinc-700" },
  "screen.delete": { label: "Skjerm slettet", icon: Trash2, cls: "bg-red-50 text-red-700" },
  "screen.token": { label: "Ny token", icon: Monitor, cls: "bg-zinc-100 text-zinc-700" },
}

function metaFor(action: string) {
  return ACTION_META[action] ?? { label: action, icon: Activity, cls: "bg-zinc-100 text-zinc-600" }
}

const dayFmt = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", year: "numeric", month: "2-digit", day: "2-digit" })
const dayLabelFmt = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", weekday: "long", day: "numeric", month: "long" })
const clockFmt = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" })

function dayLabel(iso: string): string {
  const key = dayFmt.format(new Date(iso))
  if (key === dayFmt.format(new Date())) return "I dag"
  if (key === dayFmt.format(new Date(Date.now() - 86_400_000))) return "I går"
  const label = dayLabelFmt.format(new Date(iso))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** «x min siden» for ferske hendelser, ellers klokkeslett (dagen står i gruppeheaderen). */
function timeLabel(iso: string): string {
  const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (diffMin < 1) return "nå nettopp"
  if (diffMin < 60) return `${diffMin} min siden`
  return `kl. ${clockFmt.format(new Date(iso))}`
}

const ENTITY_FILTERS = [
  { key: "", label: "Alt" },
  { key: "content", label: "Innhold" },
  { key: "auth", label: "Innlogging" },
  { key: "user", label: "Brukere" },
  { key: "store", label: "Butikker" },
  { key: "chain", label: "Merkevare" },
  { key: "screen", label: "Skjermer" },
]

export function LoggClient({ rows, limit, hasMore }: { rows: LogRow[]; limit: number; hasMore: boolean }) {
  const [search, setSearch] = useState("")
  const [entity, setEntity] = useState("")

  const filtered = useMemo(() => rows.filter((r) => {
    if (entity && r.entity_type !== entity) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.summary.toLowerCase().includes(q) && !(r.user_email ?? "").toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, search, entity])

  // Grupper per dag (Europe/Oslo) — radene kommer allerede nyeste først.
  const groups = useMemo(() => {
    const out: Array<{ key: string; label: string; items: LogRow[] }> = []
    for (const row of filtered) {
      const key = dayFmt.format(new Date(row.created_at))
      const last = out[out.length - 1]
      if (last?.key === key) last.items.push(row)
      else out.push({ key, label: dayLabel(row.created_at), items: [row] })
    }
    return out
  }, [filtered])

  // Nøkkeltall fra det lastede vinduet (ufiltrert, siste `limit` hendelser).
  // «Nå» festes ved mount — react-hooks/purity tillater ikke Date.now() i useMemo.
  const [mountedAt] = useState(() => Date.now())
  const stats = useMemo(() => {
    const todayKey = dayFmt.format(new Date(mountedAt))
    const weekAgo = mountedAt - 7 * 86_400_000
    let today = 0
    let publishes = 0
    let logins = 0
    for (const r of rows) {
      const t = new Date(r.created_at).getTime()
      if (dayFmt.format(new Date(r.created_at)) === todayKey) today++
      if (t < weekAgo) continue
      if (r.action === "content.publish") publishes++
      if (r.action === "auth.login") logins++
    }
    return [
      { label: "Hendelser i dag", value: today, icon: Zap, iconCls: "bg-amber-50 text-amber-600", glow: "rgba(245,158,11,0.10)" },
      { label: "Publiseringer siste 7 dager", value: publishes, icon: Send, iconCls: "bg-emerald-50 text-emerald-600", glow: "rgba(16,185,129,0.10)" },
      { label: "Innlogginger siste 7 dager", value: logins, icon: LogIn, iconCls: "bg-sky-50 text-sky-600", glow: "rgba(14,165,233,0.10)" },
    ]
  }, [rows, mountedAt])

  // Aktivitet per dag siste 14 dager (Oslo) — for sparkline-kortet.
  const series = useMemo(() => {
    const counts = new Map<string, number>()
    for (let i = 13; i >= 0; i--) counts.set(dayFmt.format(new Date(mountedAt - i * 86_400_000)), 0)
    for (const r of rows) {
      const k = dayFmt.format(new Date(r.created_at))
      if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return [...counts.values()]
  }, [rows, mountedAt])
  const seriesTotal = series.reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, iconCls, glow }, i) => (
          <div
            key={label}
            className="fx-rise relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-20 w-24 rounded-full"
              style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
            />
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="font-display block text-2xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums"><CountUp value={value} /></span>
              <span className="mt-1 block text-[11px] leading-tight text-zinc-500">{label}</span>
            </span>
          </div>
        ))}
        <div
          className="fx-rise relative col-span-2 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          style={{ animationDelay: "180ms" }}
        >
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Aktivitet siste 14 dager</span>
            <span className="font-display text-sm font-bold tabular-nums text-zinc-900"><CountUp value={seriesTotal} /></span>
          </div>
          <Sparkline values={series} className="mt-1.5 h-12 w-full" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk i logg…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ENTITY_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setEntity(f.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${entity === f.key ? "bg-zinc-900 text-white shadow-sm" : "bg-white text-zinc-600 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-zinc-200 hover:ring-zinc-300 hover:text-zinc-900"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <Activity className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700">
            {rows.length > 0 ? "Ingen treff med dette filteret" : "Ingen loggføringer ennå"}
          </p>
          {rows.length > 0 && (
            <button
              type="button"
              onClick={() => { setSearch(""); setEntity("") }}
              className="mt-1 text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
            >
              Nullstill filtre
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key}>
              <header className="flex items-baseline gap-2 px-1 pb-2">
                <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{group.label}</span>
                <span className="text-[11px] tabular-nums text-zinc-400">{group.items.length}</span>
              </header>
              <ul className="space-y-2">
                {group.items.map((r, idx) => {
                  const m = metaFor(r.action)
                  const Icon = m.icon
                  return (
                    <li
                      key={r.id}
                      className="fx-rise flex items-center gap-3.5 rounded-2xl border border-zinc-200/70 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.03)] transition-all hover:-translate-y-px hover:border-zinc-300/70 hover:shadow-[0_6px_16px_-8px_rgba(16,24,40,0.14)]"
                      style={{ animationDelay: `${Math.min(idx, 12) * 30}ms` }}
                    >
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${m.cls}`}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">{r.summary}</p>
                        <p className="truncate text-xs text-zinc-400">{r.user_email ?? "System"} · {m.label}</p>
                      </div>
                      <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-zinc-50 px-2.5 py-1 text-[11px] tabular-nums text-zinc-500 ring-1 ring-inset ring-zinc-200/70">
                        {timeLabel(r.created_at)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="text-[11px] text-zinc-400">Viser de siste {rows.length} hendelsene.</p>
      {hasMore && (
        <a
          href={`/admin/logg?antall=${limit + 400}`}
          className="inline-block rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
        >
          Vis eldre hendelser
        </a>
      )}
    </div>
  )
}
