"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Search, CornerDownLeft, Megaphone, Newspaper, CalendarRange, Monitor, Ticket, QrCode,
  Store, Tv, Users, ScrollText, Settings, FilePlus, UserPlus, Loader2, Compass, type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { enabledSurfaces } from "@/lib/tenant/features"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { kommandoSok, type KommandoTreff } from "@/app/admin/kommando-actions"

/**
 * ⌘K-kommandopalett: naviger til sider, opprett nytt og søk på tvers av
 * innhold/butikker/brukere. Åpnes med Cmd/Ctrl+K eller topbar-knappen
 * (custom event «aapne-kommando»). Statisk del speiler sidebarens
 * rolle-styring; dynamisk del går via kommandoSok (RLS + tenant-scoping).
 */

type Rolle = "super_admin" | "chain_manager" | "area_manager" | "store_manager" | "store_employee"

interface StatiskKommando {
  label: string
  sub: string
  href: string
  icon: LucideIcon
  roller: Rolle[]
  /** Skjermflaten kommandoen hører til — skjules når tenanten har skrudd flaten av. */
  flate?: "kunde" | "intern"
}

const ALLE: Rolle[] = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"]
const LEDERE: Rolle[] = ["super_admin", "chain_manager", "area_manager", "store_manager"]

const SIDER: StatiskKommando[] = [
  { label: "Kundeskjerm", sub: "Innhold til kundene", href: "/admin/kundeinnhold", icon: Megaphone, roller: ALLE, flate: "kunde" },
  { label: "Internt innhold", sub: "Bakrom og ansatte", href: "/admin/innhold", icon: Newspaper, roller: ALLE, flate: "intern" },
  { label: "Planen", sub: "Hva som vises når", href: "/admin/plan", icon: CalendarRange, roller: ALLE },
  { label: "Forhåndsvisning", sub: "Se skjermene live", href: "/admin/cms", icon: Monitor, roller: LEDERE },
  { label: "Invitasjoner", sub: "Arrangementer og påmelding", href: "/admin/invitasjoner", icon: Ticket, roller: ALLE },
  { label: "Kundeklubb", sub: "Medlemmer per butikk", href: "/admin/kundeklubb", icon: QrCode, roller: LEDERE, flate: "kunde" },
  { label: "Butikker", sub: "Enheter og tagger", href: "/admin/stores", icon: Store, roller: ["super_admin", "chain_manager", "area_manager"] },
  { label: "Skjermer", sub: "Skjerm-styring og status", href: "/admin/skjermer", icon: Tv, roller: LEDERE },
  { label: "Brukere", sub: "Tilgang og roller", href: "/admin/users", icon: Users, roller: LEDERE },
  { label: "Logg", sub: "Aktivitet og endringer", href: "/admin/logg", icon: ScrollText, roller: ["super_admin", "chain_manager"] },
  { label: "Innstillinger", sub: "Merkevare og oppsett", href: "/admin/settings", icon: Settings, roller: LEDERE },
]

const HANDLINGER: StatiskKommando[] = [
  { label: "Nytt kundeinnhold", sub: "Opprett innslag til kundeskjermen", href: "/admin/kundeinnhold/ny", icon: FilePlus, roller: ALLE, flate: "kunde" },
  { label: "Nytt internt innslag", sub: "Opprett innslag til internskjermen", href: "/admin/innhold/ny", icon: FilePlus, roller: ALLE, flate: "intern" },
  { label: "Ny butikk", sub: "Registrer en ny enhet", href: "/admin/stores/new", icon: Store, roller: ["super_admin", "chain_manager", "area_manager"] },
  { label: "Inviter bruker", sub: "Gi noen tilgang", href: "/admin/users", icon: UserPlus, roller: LEDERE },
]

const GRUPPE_META: Record<KommandoTreff["gruppe"], { label: string; icon: LucideIcon }> = {
  innhold: { label: "Innhold", icon: Newspaper },
  butikker: { label: "Butikker", icon: Store },
  brukere: { label: "Brukere", icon: Users },
}

interface Rad {
  key: string
  label: string
  sub: string | null
  href: string
  icon: LucideIcon
  gruppe: string
}

export function CommandPalette({ role }: { role: string }) {
  const router = useRouter()
  // Skjul kommandoer for flater tenanten har skrudd av (speiler sidebaren).
  const surfaces = enabledSurfaces(useTenantConfig().features)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [treff, setTreff] = useState<KommandoTreff[]>([])
  const [aktiv, setAktiv] = useState(0)
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const rolle = (ALLE.includes(role as Rolle) ? role : "store_employee") as Rolle

  const aapne = useCallback(() => {
    setQuery("")
    setTreff([])
    setAktiv(0)
    setOpen(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => {
          if (o) return false
          setQuery("")
          setTreff([])
          setAktiv(0)
          return true
        })
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("aapne-kommando", aapne)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("aapne-kommando", aapne)
    }
  }, [aapne])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 30)
    document.body.style.overflow = "hidden"
    return () => {
      clearTimeout(t)
      document.body.style.overflow = ""
    }
  }, [open])

  // Debounced server-søk — all setState skjer i timeout/transition-callbacks.
  useEffect(() => {
    if (!open) return
    const q = query.trim()
    const t = setTimeout(() => {
      if (q.length < 2) {
        setTreff([])
        return
      }
      startTransition(async () => {
        setTreff(await kommandoSok(q))
      })
    }, 180)
    return () => clearTimeout(t)
  }, [query, open])

  const rader = useMemo<Rad[]>(() => {
    const q = query.trim().toLowerCase()
    const passer = (k: StatiskKommando) =>
      k.roller.includes(rolle) &&
      (!k.flate || surfaces[k.flate]) &&
      (!q || k.label.toLowerCase().includes(q) || k.sub.toLowerCase().includes(q))
    const sider: Rad[] = SIDER.filter(passer).map((k) => ({ key: `s:${k.href}`, label: k.label, sub: k.sub, href: k.href, icon: k.icon, gruppe: "Gå til" }))
    const handlinger: Rad[] = HANDLINGER.filter(passer).map((k) => ({ key: `h:${k.href}:${k.label}`, label: k.label, sub: k.sub, href: k.href, icon: k.icon, gruppe: "Handlinger" }))
    const dynamiske: Rad[] = treff.map((t, i) => ({ key: `d:${i}:${t.href}`, label: t.label, sub: t.sub, href: t.href, icon: GRUPPE_META[t.gruppe].icon, gruppe: GRUPPE_META[t.gruppe].label }))
    return [...dynamiske, ...handlinger, ...sider]
  }, [query, treff, rolle, surfaces])

  // Klampes ved render i stedet for å resettes i en effect.
  const aktivIdx = rader.length > 0 ? Math.min(aktiv, rader.length - 1) : 0

  const velg = useCallback((rad: Rad | undefined) => {
    if (!rad) return
    setOpen(false)
    router.push(rad.href)
  }, [router])

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAktiv(Math.min(aktivIdx + 1, rader.length - 1)) }
    if (e.key === "ArrowUp") { e.preventDefault(); setAktiv(Math.max(aktivIdx - 1, 0)) }
    if (e.key === "Enter") { e.preventDefault(); velg(rader[aktivIdx]) }
  }

  if (!open) return null

  let forrigeGruppe = ""

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Kommandopalett">
      <button aria-label="Lukk" className="absolute inset-0 bg-zinc-950/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="fx-rise absolute inset-x-4 top-[12vh] mx-auto max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_32px_90px_-18px_rgba(9,12,20,0.55)] ring-1 ring-zinc-200/80">
        <div className="flex items-center gap-2.5 border-b border-zinc-100 px-4 py-3">
          {pending ? <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-primary)]" /> : <Search className="h-4 w-4 text-zinc-400" />}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setAktiv(0) }}
            onKeyDown={onInputKey}
            placeholder="Søk i innhold, butikker, brukere — eller gå til…"
            className="h-7 flex-1 border-0 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <kbd className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {rader.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <Compass className="h-7 w-7 text-zinc-300" />
              <p className="text-sm text-zinc-500">{pending ? "Søker…" : "Ingen treff — prøv et annet søkeord."}</p>
            </div>
          ) : (
            rader.map((rad, i) => {
              const Icon = rad.icon
              const visGruppe = rad.gruppe !== forrigeGruppe
              forrigeGruppe = rad.gruppe
              return (
                <div key={rad.key}>
                  {visGruppe && (
                    <p className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{rad.gruppe}</p>
                  )}
                  <button
                    onClick={() => velg(rad)}
                    onMouseMove={() => setAktiv(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                      i === aktivIdx ? "bg-[var(--brand-light)] ring-1 ring-inset ring-[var(--brand-primary)]/20" : "hover:bg-zinc-50"
                    )}
                  >
                    <span className={cn(
                      "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg",
                      i === aktivIdx ? "bg-white text-[var(--brand-primary)] shadow-sm" : "bg-zinc-100 text-zinc-500"
                    )}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900">{rad.label}</span>
                      {rad.sub && <span className="block truncate text-xs text-zinc-400">{rad.sub}</span>}
                    </span>
                    {i === aktivIdx && <CornerDownLeft className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400" />}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/60 px-4 py-2 text-[10px] text-zinc-400">
          <span><kbd className="font-semibold">↑↓</kbd> naviger · <kbd className="font-semibold">↵</kbd> åpne</span>
          <span className="font-semibold uppercase tracking-widest">Kommando</span>
        </div>
      </div>
    </div>
  )
}
