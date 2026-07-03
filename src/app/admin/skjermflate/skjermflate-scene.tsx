"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Search, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Megaphone, Monitor, Layers, LayoutGrid } from "lucide-react"
import { heleEnhetenLabel } from "@/lib/tenant/config"
import { ScreenPill, DeckContent } from "./fleet-decks"
import { NowPlaying, Kommende, FleetOverview, DriftPanel } from "./fleet-sections"
import type { CardSpec, ContentKind, FleetStore, FleetStats, FaultLite, TopPlayLite, ContentHealth, UpcomingLite } from "./types"

/**
 * Skjermflåte — kinematografisk kommandosentral. Coverflow over flåten øverst
 * (senterkortet i fokus, sidekortene tilter bakover), så «Nå på skjermen»-drill-
 * down, kommende innhold, flåte-oversikt og drift. Kortene viser skjermens
 * FAKTISKE innhold (skalerte /widget/*-iframes), styrt av skjermens rolle:
 * kundeskjermer viser kundeinnhold, interne viser internt (KPI aldri på kunde).
 * Butikker med få skjermer fylles ut med kuraterte demo-decks.
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
  unitLabelPlural: string
  showKpi: boolean
}

type Tab = "alle" | "kunde" | "internt"

const KIND_META: Record<ContentKind, { icon: typeof Megaphone; cls: string }> = {
  kunde: { icon: Megaphone, cls: "text-emerald-300 bg-emerald-400/10" },
  intern: { icon: Monitor, cls: "text-sky-300 bg-sky-400/10" },
  kpi: { icon: Monitor, cls: "text-sky-300 bg-sky-400/10" },
  demo: { icon: LayoutGrid, cls: "text-amber-300 bg-amber-400/10" },
}

export function SkjermflateScene({ stores, stats, faults, topPlays, health, upcoming, lastSync, userName, unitLabel, unitLabelPlural, showKpi }: SkjermflateSceneProps) {
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const [tab, setTab] = useState<Tab>("alle")
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

  const cards = useMemo(() => (focus ? buildCards(focus, tab, heleLabel) : []), [focus, tab, heleLabel])
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

  const TABS: { key: Tab; label: string }[] = [
    { key: "alle", label: "Alle skjermer" },
    { key: "kunde", label: "Kundeskjerm" },
    { key: "internt", label: "Internt" },
  ]

  const activeCard = cards[active]

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
          <span className={stats.onlineNow > 0 ? "sf-dot" : ""} style={{ width: 7, height: 7, borderRadius: "50%", background: stats.onlineNow > 0 ? "#4ade80" : "#6b6a72" }} />
          {stats.onlineNow > 0 ? `Live · sist synk ${lastSync}` : "Demo-forhåndsvisning"}
        </div>
      </div>

      {/* ── Stat-strip (ekte aggregat) ─────────────────────────────────────── */}
      <div className="relative z-20 mt-5 grid grid-cols-2 gap-3 px-4 sm:px-8 lg:grid-cols-4">
        <StatCard label="Skjermer totalt" value={stats.totalScreens} />
        <StatCard label="Online nå" value={stats.onlineNow} dot="#4ade80" pulse={stats.onlineNow > 0} />
        <StatCard label="Trenger tilsyn" value={stats.needsAttention} dot={stats.needsAttention > 0 ? "#f0616a" : "#4ade80"} />
        <StatCard label="Aktive innslag" value={stats.liveItems} accent />
      </div>

      {/* ── Coverflow (hero) ───────────────────────────────────────────────── */}
      {focus && cards.length > 0 ? (
        <>
          <Coverflow cards={cards} total={stats.totalScreens} active={active} onActive={setActive} />
          {activeCard && <NowPlaying card={activeCard} store={focus} heleLabel={heleLabel} showKpi={showKpi} />}
          <Kommende upcoming={upcoming} />
          <FleetOverview stores={ordered} activeStoreId={focusId} onFocus={focusStore} />
          <DriftPanel health={health} faults={faults} topPlays={topPlays} />
        </>
      ) : (
        <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-20 text-center">
          <p className="max-w-sm text-[14px] text-[#8b8a92]">Ingen {unitLabelPlural.toLowerCase()} er satt opp ennå.</p>
        </div>
      )}
    </div>
  )
}

/* ── Bygg kort-lista: skjermens rolle styrer innholdet · demo kun ved få ───── */

function buildCards(focus: FleetStore, tab: Tab, heleLabel: string): CardSpec[] {
  // Filtrer på flate (kunde/intern). Hvert kort spiller skjermens EKTE widget-URL.
  const filtered = focus.screens.filter((s) =>
    tab === "kunde" ? s.flate === "kunde" : tab === "internt" ? s.flate === "intern" : true,
  )
  const demoCycle: CardSpec["demo"][] = ["offer", "menu", "hours"]

  const real: CardSpec[] = filtered.map((s) => ({
    key: `s-${s.displayId}`,
    live: true,
    src: s.widgetSrc,
    demo: "offer",
    store: focus.name,
    pill: { label: s.name, state: s.online },
    contentLabel: s.flate === "intern" ? "Internskjerm · Bakrom" : "Kundeskjerm",
    contentKind: s.flate === "intern" ? "intern" : "kunde",
    avdeling: s.avdelingLabel,
    orientation: s.orientation,
    screen: s,
  }))

  // «Kun demo når det er få skjermer på en kunde» — fyll bare ut når < 3 ekte.
  const cards = [...real]
  if (real.length < 3) {
    let d = 0
    while (cards.length < 4) {
      cards.push({
        key: `demo-${d}`,
        live: false,
        demo: demoCycle[d % demoCycle.length],
        store: focus.name,
        pill: { label: focus.name, state: null },
        contentLabel: "Demo-forhåndsvisning",
        contentKind: "demo",
        avdeling: heleLabel,
        orientation: "portrait",
      })
      d++
    }
  }
  return cards
}

/* ── Coverflow-karusellen ──────────────────────────────────────────────────── */

function Coverflow({ cards, total, active, onActive }: { cards: CardSpec[]; total: number; active: number; onActive: (n: number) => void }) {
  const [dragDx, setDragDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [unit, setUnit] = useState(240)
  const trackRef = useRef<HTMLDivElement>(null)
  const dragState = useRef({ x: 0, moved: 0 })

  // unit = stående korts bredde (responsiv). Liggende kort (bakrom/KPI) blir
  // bredere og lavere, som en TV ved siden av en telefon.
  const portraitH = Math.round((unit * 16) / 9)
  const widthOf = (o: CardSpec["orientation"]) => (o === "landscape" ? Math.round(unit * 1.55) : unit)
  const heightOf = (o: CardSpec["orientation"]) => (o === "landscape" ? Math.round((unit * 1.55 * 9) / 16) : portraitH)

  useEffect(() => {
    const el = trackRef.current
    if (!el) return
    const update = () => setUnit(Math.round(Math.min(300, Math.max(168, el.clientWidth * 0.55))))
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(() => setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches), [])

  const clamp = (n: number) => Math.max(0, Math.min(cards.length - 1, n))
  const go = (n: number) => onActive(clamp(n))

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    setDragging(true)
    dragState.current = { x: e.clientX, moved: 0 }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragState.current.x
    dragState.current.moved = Math.max(dragState.current.moved, Math.abs(dx))
    setDragDx(dx)
  }
  const endDrag = () => {
    if (!dragging) return
    setDragging(false)
    const step = Math.round(-dragDx / (unit * 0.9))
    setDragDx(0)
    if (step !== 0) go(active + step)
  }
  const onWheel = (e: React.WheelEvent) => {
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
    if (Math.abs(d) < 18) return
    go(active + (d > 0 ? 1 : -1))
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(active + 1) }
    if (e.key === "ArrowLeft") { e.preventDefault(); go(active - 1) }
  }

  return (
    <div className="relative z-10 flex flex-col">
      <div
        ref={trackRef}
        tabIndex={0}
        role="listbox"
        aria-label="Skjermflåte"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        className="relative cursor-grab touch-pan-y select-none overflow-hidden outline-none active:cursor-grabbing"
        style={{ perspective: 1800, height: portraitH + 120 }}
      >
        <div
          aria-hidden
          className="sf-floor pointer-events-none absolute"
          style={{ left: "-6%", right: "-6%", bottom: 0, height: 280, transform: "rotateX(76deg)", transformOrigin: "bottom center" }}
        />
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          {(() => {
            // Bredde-bevisste sentre: stående og liggende kort ligger pent ved
            // siden av hverandre uten å skjule hverandre.
            const widths = cards.map((c) => widthOf(c.orientation))
            const centers = new Array<number>(cards.length).fill(0)
            for (let i = active + 1; i < cards.length; i++) centers[i] = centers[i - 1] + (widths[i - 1] + widths[i]) / 2 * 0.6 + 8
            for (let i = active - 1; i >= 0; i--) centers[i] = centers[i + 1] - (widths[i] + widths[i + 1]) / 2 * 0.6 - 8
            return cards.map((c, i) => {
              const abs = Math.abs(i - active)
              if (abs > 3) return null
              const sign = Math.sign(i - active)
              const x = centers[i] + (dragging ? dragDx : 0)
              const rotateY = abs === 0 ? 0 : -sign * 44
              const z = abs === 0 ? 0 : -abs * unit * 0.68
              const scale = abs === 0 ? 1 : Math.max(0.66, 0.8 - (abs - 1) * 0.08)
              const opacity = Math.max(0.14, 1 - abs * 0.28)
              const isCenter = abs === 0
              return (
                <div
                  key={c.key}
                  onClick={() => { if (!isCenter && dragState.current.moved < 6) go(i) }}
                  className="absolute left-1/2 top-[47%]"
                  style={{
                    width: widths[i],
                    height: heightOf(c.orientation),
                    transform: `translate(-50%,-50%) translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg) scale(${scale})`,
                    opacity,
                    zIndex: 100 - abs,
                    transition: dragging ? "none" : "transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.55s ease",
                    cursor: isCenter ? "inherit" : "pointer",
                  }}
                >
                  <div
                    className={`${reduced || !isCenter ? "" : "sf-deck-in"} h-full w-full overflow-hidden rounded-[22px] border`}
                    style={{
                      borderColor: isCenter ? "color-mix(in oklab, var(--brand-primary) 48%, rgba(255,255,255,0.14))" : "rgba(255,255,255,0.1)",
                      boxShadow: isCenter
                        ? "0 64px 128px -28px rgba(0,0,0,0.92), 0 0 90px -24px color-mix(in oklab, var(--brand-primary) 72%, transparent)"
                        : "0 40px 82px -30px rgba(0,0,0,0.85)",
                    }}
                  >
                    <DeckContent spec={c} w={widths[i]} />
                  </div>
                  {!isCenter && <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[22px]" style={{ background: "rgba(8,8,10,0.34)" }} />}
                </div>
              )
            })
          })()}
        </div>

        <button onClick={() => go(active - 1)} aria-label="Forrige skjerm" className="absolute left-2 top-1/2 z-[200] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,24,0.72)] text-[#c9c8d0] backdrop-blur-md transition-colors hover:border-white/25 hover:text-white sm:left-6">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button onClick={() => go(active + 1)} aria-label="Neste skjerm" className="absolute right-2 top-1/2 z-[200] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[rgba(20,20,24,0.72)] text-[#c9c8d0] backdrop-blur-md transition-colors hover:border-white/25 hover:text-white sm:right-6">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Aktiv skjerm: pille + skjermtype + avdeling + prikker */}
      <div className="relative z-10 flex flex-col items-center gap-3 px-4 pb-3 pt-4">
        {cards[active] && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <ScreenPill pill={cards[active].pill} big />
            <ActiveChip icon={KIND_META[cards[active].contentKind].icon} cls={KIND_META[cards[active].contentKind].cls}>{cards[active].contentLabel}</ActiveChip>
            <ActiveChip icon={Layers} cls="text-zinc-300 border-white/10 bg-white/5">{cards[active].avdeling}</ActiveChip>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {cards.map((c, i) => (
            <button key={c.key} onClick={() => go(i)} aria-label={`Skjerm ${i + 1}`} className="h-1.5 rounded-full transition-all" style={{ width: i === active ? 22 : 6, background: i === active ? "var(--brand-primary)" : "rgba(255,255,255,0.22)" }} />
          ))}
        </div>
        <p className="text-center text-[12px] font-semibold text-[#55545c]">
          {total > 0 ? `${total} skjermer i flåten · dra eller bla for å utforske` : "Demo-forhåndsvisning · koble til skjermer for live-status"}
        </p>
      </div>
    </div>
  )
}

function ActiveChip({ icon: Icon, cls, children }: { icon: typeof Megaphone; cls: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold ${cls}`}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
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
