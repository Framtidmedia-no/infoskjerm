"use client"

import { useMemo, useState } from "react"
import { LogIn, FilePlus, FileEdit, Send, EyeOff, Trash2, Copy, CalendarPlus, UserPlus, Shield, Store, Tag, Palette, Monitor, Search, Activity } from "lucide-react"

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk i logg…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/15" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ENTITY_FILTERS.map((f) => (
            <button key={f.key} onClick={() => setEntity(f.key)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${entity === f.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}>
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
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          {groups.map((group) => (
            <section key={group.key}>
              <header className="border-y border-zinc-100 bg-zinc-50/80 px-4 py-1.5 backdrop-blur first:border-t-0">
                <span className="font-display text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{group.label}</span>
                <span className="ml-2 text-[11px] tabular-nums text-zinc-400">{group.items.length}</span>
              </header>
              {/* Tidslinje-rail gjennom dagens hendelser */}
              <ul className="relative">
                <span aria-hidden className="absolute bottom-2 left-[31px] top-2 w-px bg-zinc-100" />
                {group.items.map((r) => {
                  const m = metaFor(r.action)
                  const Icon = m.icon
                  return (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-zinc-50/70">
                      <span className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ring-4 ring-white ${m.cls}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-zinc-800">{r.summary}</p>
                        <p className="truncate text-[11px] text-zinc-400">{r.user_email ?? "System"} · {m.label}</p>
                      </div>
                      <span className="flex-shrink-0 whitespace-nowrap text-[11px] tabular-nums text-zinc-400">{timeLabel(r.created_at)}</span>
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
