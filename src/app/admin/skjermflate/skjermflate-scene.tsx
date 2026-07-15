"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, RefreshCw, ChevronDown, Tv, MonitorX } from "lucide-react"
import { heleEnhetenLabel } from "@/lib/tenant/config"
import { buildRealCards, type FlateTab } from "./build-cards"
import { Coverflow } from "./coverflow"
import { useIsDesktop } from "./use-is-desktop"
import { NowPlaying, Kommende, FleetOverview, DriftPanel, FleetMobile } from "./fleet-sections"
import type { FleetStore, FleetStats, FaultLite, TopPlayLite, ContentHealth, UpcomingLite } from "./types"

/**
 * Skjermflåte — kinematografisk kommandosentral. Coverflow over flåten øverst
 * (senterkortet i fokus, sidekortene tilter bakover), så «Nå på skjermen»-drill-
 * down, kommende innhold, flåte-oversikt og drift. Kortene viser skjermens
 * FAKTISKE innhold (skalerte /widget/*-iframes), styrt av skjermens rolle:
 * kundeskjermer viser kundeinnhold, interne viser internt (KPI aldri på kunde).
 * Mobil (< lg) får en lettvekts variant uten 3D/iframes (iOS-OOM-trygg).
 *
 * Ekte og fabrikkert blandes ALDRI: karusellen viser kun ekte skjermer (ingen
 * demo-padding), og en butikk uten skjermer får en ærlig tomtilstand med CTA.
 * Tenant helt uten skjermer rutes til FleetOnboarding av page.tsx.
 */

export interface SkjermflateSceneProps {
  stores: FleetStore[]
  stats: FleetStats
  faults: FaultLite[]
  topPlays: TopPlayLite[]
  health: ContentHealth
  upcoming: UpcomingLite[]
  lastSync: string
  userName: string | null
  unitLabel: string
  showKpi: boolean
}

export function SkjermflateScene({ stores, stats, faults, topPlays, health, upcoming, lastSync, userName, unitLabel, showKpi }: SkjermflateSceneProps) {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [refreshing, startRefresh] = useTransition()
  const [tab, setTab] = useState<FlateTab>("alle")
  const heleLabel = heleEnhetenLabel(unitLabel)

  const ordered = useMemo(
    () =>
      [...stores].sort(
        (a, b) =>
          b.screens.filter((s) => s.online).length - a.screens.filter((s) => s.online).length ||
          b.screens.length - a.screens.length ||
          a.name.localeCompare(b.name, "nb"),
      ),
    [stores],
  )
  const [focusId, setFocusId] = useState(ordered[0]?.id ?? "")
  const focus = stores.find((s) => s.id === focusId) ?? ordered[0]

  const cards = useMemo(() => (focus ? buildRealCards(focus, tab) : []), [focus, tab])
  const [active, setActive] = useState(0)
  useEffect(() => {
    const i = cards.findIndex((c) => c.pill.state === true)
    setActive(i < 0 ? 0 : i)
  }, [cards])

  const focusStore = (id: string) => {
    setFocusId(id)
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" })
  }
  const openCommand = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }))
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }))
  }
  const handleRefresh = () => {
    startRefresh(() => router.refresh())
    toast.success(`Live-status oppdatert · ${new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }).format(new Date())}`)
  }

  const TABS: { key: FlateTab; label: string }[] = [
    { key: "alle", label: "Alle skjermer" },
    { key: "kunde", label: "Kundeskjerm" },
    { key: "internt", label: "Internt" },
  ]

  const activeCard = cards[active]
  const fleetLabel = `${stats.totalScreens} ${stats.totalScreens === 1 ? "skjerm" : "skjermer"} i flåten`

  return (
    <div className="skjermflate relative flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[#08080a] text-[#f4f3f5] md:min-h-screen">
      <div
        aria-hidden
        className="sf-glow pointer-events-none absolute inset-0 z-0"
        style={{ background: "radial-gradient(50% 34% at 50% 26%, color-mix(in oklab, var(--brand-primary) 30%, transparent), transparent 70%)" }}
      />
      <div aria-hidden className="fx-stars pointer-events-none absolute inset-0 z-0 opacity-[0.08]" />

      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header className="relative z-20 flex flex-col gap-4 px-4 pt-6 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div>
          <h1 className="font-display text-[24px] font-bold leading-tight tracking-tight text-white sm:text-[30px]">Skjermflåte</h1>
          <p className="mt-1 text-[13px] font-medium text-[#8b8a92] sm:text-[14px]">
            {userName ? `${userName} — forhåndsvis` : "Forhåndsvis"} og styr hva som vises på hver skjerm, i sanntid.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={openCommand}
            className="hidden items-center gap-2 rounded-xl bg-white/[0.05] px-3.5 py-2.5 text-[#6b6a72] transition-colors hover:bg-white/[0.09] hover:text-[#b9b8c0] sm:flex"
          >
            <Search className="h-[15px] w-[15px]" />
            <span className="text-[13px]">Søk</span>
            <kbd className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-[#8b8a92]">⌘K</kbd>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Hent skjermenes live-status på nytt fra skjermmotoren"
            className="fx-btn flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-[var(--brand-fg)] transition-transform active:scale-[0.98] disabled:opacity-70"
            style={{ background: "var(--brand-primary)", boxShadow: "0 10px 26px -10px color-mix(in oklab, var(--brand-primary) 85%, transparent)" }}
          >
            <RefreshCw className={`h-[15px] w-[15px] ${refreshing ? "animate-spin" : ""}`} />
            Oppdater
          </button>
        </div>
      </header>

      {/* ── Faner + fokus-butikk + live-status ─────────────────────────────── */}
      <div className="relative z-20 mt-5 flex flex-wrap items-center gap-3 px-4 sm:px-8">
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-white/[0.05] p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${tab === t.key ? "bg-white/[0.12] text-white" : "text-[#8b8a92] hover:text-[#c9c8d0]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {stores.length > 1 && (
          <div className="relative">
            <select
              value={focusId}
              onChange={(e) => setFocusId(e.target.value)}
              className="appearance-none rounded-xl bg-white/[0.05] py-2.5 pl-3.5 pr-9 text-[13px] font-semibold text-[#c9c8d0] outline-none transition-colors focus:bg-white/[0.09]"
              style={{ backgroundImage: "none" }}
            >
              {ordered.map((s) => {
                const n = s.screens.length
                return (
                  <option key={s.id} value={s.id} style={{ background: "#131316" }}>
                    {s.name}
                    {n > 0 ? ` · ${n} skjerm${n > 1 ? "er" : ""}` : ""}
                  </option>
                )
              })}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#6b6a72]" />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2 text-[12px] font-semibold text-[#8b8a92]">
          <span className={stats.onlineNow > 0 ? "sf-dot" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: stats.onlineNow > 0 ? "#4ade80" : "#f0616a" }} />
          {stats.onlineNow > 0 ? `Live · sist synk ${lastSync}` : `Ingen skjermer online · sist synk ${lastSync}`}
        </div>
      </div>

      {/* ── Stat-strip (ekte aggregat) ─────────────────────────────────────── */}
      <div className="relative z-20 mt-5 grid grid-cols-2 gap-3 px-4 sm:px-8 lg:grid-cols-4">
        <StatCard label="Skjermer totalt" value={stats.totalScreens} />
        <StatCard label="Online nå" value={stats.onlineNow} dot={stats.onlineNow > 0 ? "#4ade80" : "#6b6a72"} pulse={stats.onlineNow > 0} />
        <StatCard label="Trenger tilsyn" value={stats.needsAttention} dot={stats.needsAttention > 0 ? "#f0616a" : "#4ade80"} />
        <StatCard label="Aktive innslag" value={stats.liveItems} accent />
      </div>

      {/* ── Hero: coverflow (desktop) / lettvekts mobil-variant (iOS-trygg) ───
           Kun EKTE skjermer — aldri demo-padding. Tomt = ærlig tomtilstand. */}
      {focus && (
        isDesktop ? (
          cards.length > 0 ? (
            <>
              <Coverflow cards={cards} active={active} onActive={setActive} footer={`${fleetLabel}${cards.length > 1 ? " · dra eller bla for å utforske" : ""}`} />
              {activeCard && <NowPlaying card={activeCard} store={focus} heleLabel={heleLabel} showKpi={showKpi} />}
            </>
          ) : (
            <EmptyFocus store={focus} tab={tab} unitLabel={unitLabel} onShowAll={() => setTab("alle")} />
          )
        ) : focus.screens.length > 0 ? (
          <FleetMobile focus={focus} heleLabel={heleLabel} />
        ) : (
          <EmptyFocus store={focus} tab="alle" unitLabel={unitLabel} onShowAll={() => setTab("alle")} />
        )
      )}

      <Kommende upcoming={upcoming} />
      <FleetOverview stores={ordered} activeStoreId={focusId} onFocus={focusStore} />
      <DriftPanel health={health} faults={faults} topPlays={topPlays} />
    </div>
  )
}

/* ── Tomtilstand for fokus-butikken — ærlig, med vei videre ────────────────── */

function EmptyFocus({ store, tab, unitLabel, onShowAll }: { store: FleetStore; tab: FlateTab; unitLabel: string; onShowAll: () => void }) {
  const noneAtAll = store.screens.length === 0
  const flateLabel = tab === "kunde" ? "kundeskjermer" : "internskjermer"
  return (
    <div className="relative z-10 flex flex-col items-center px-6 py-16 text-center sm:py-20">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          background: "color-mix(in oklab, var(--brand-primary) 14%, transparent)",
          color: "color-mix(in oklab, var(--brand-primary) 85%, white)",
          boxShadow: "0 16px 40px -16px color-mix(in oklab, var(--brand-primary) 70%, transparent)",
        }}
      >
        {noneAtAll ? <Tv className="h-6 w-6" /> : <MonitorX className="h-6 w-6" />}
      </span>
      {noneAtAll ? (
        <>
          <h2 className="mt-5 font-display text-[22px] font-bold tracking-tight text-white sm:text-[26px]">Ingen skjermer i {store.name} ennå</h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[#8b8a92]">
            {store.liveCount > 0
              ? `${store.liveCount} innslag er klare for ${unitLabel.toLowerCase()}en og spilles automatisk så snart en skjerm kobles til.`
              : `Koble til en skjerm, så vises den her med alt den spiller — i sanntid.`}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/admin/skjermer"
              className="fx-btn inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-[var(--brand-fg)] transition-transform active:scale-[0.98]"
              style={{ background: "var(--brand-primary)", boxShadow: "0 12px 28px -12px color-mix(in oklab, var(--brand-primary) 85%, transparent)" }}
            >
              <Tv className="h-4 w-4" />
              Legg til skjerm
            </Link>
            <Link href="/admin/kundeinnhold" className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-2.5 text-[13px] font-semibold text-[#c9c8d0] transition-colors hover:bg-white/[0.09] hover:text-white">
              Se innholdet
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="mt-5 font-display text-[22px] font-bold tracking-tight text-white sm:text-[26px]">Ingen {flateLabel} i {store.name}</h2>
          <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-[#8b8a92]">
            {store.name} har {store.screens.length} {store.screens.length === 1 ? "skjerm" : "skjermer"} på andre flater.
          </p>
          <button
            onClick={onShowAll}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-2.5 text-[13px] font-semibold text-[#c9c8d0] transition-colors hover:bg-white/[0.09] hover:text-white"
          >
            Vis alle skjermer
          </button>
        </>
      )}
    </div>
  )
}

/* ── Stat-kort ─────────────────────────────────────────────────────────────── */

function StatCard({ label, value, dot, pulse, accent }: { label: string; value: number; dot?: string; pulse?: boolean; accent?: boolean }) {
  const numColor = accent ? "color-mix(in oklab, var(--brand-primary) 82%, white)" : "#f4f3f5"
  return (
    <div
      className="fx-rise rounded-2xl px-4 py-4 sm:px-5"
      style={{ background: accent
        ? "radial-gradient(130% 130% at 50% 0%, color-mix(in oklab, var(--brand-primary) 14%, transparent), transparent 66%)"
        : "radial-gradient(130% 130% at 50% 0%, rgba(255,255,255,0.035), transparent 66%)" }}
    >
      <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#6b6a72]">{label}</div>
      <div className="mt-1.5 flex items-center gap-2.5">
        {dot && <span className={pulse ? "sf-dot" : ""} style={{ width: 9, height: 9, borderRadius: "50%", background: dot }} />}
        <span
          className="font-display text-[28px] font-bold leading-none tabular-nums sm:text-[32px]"
          style={{ color: numColor, textShadow: accent ? "0 0 26px color-mix(in oklab, var(--brand-primary) 45%, transparent)" : undefined }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
