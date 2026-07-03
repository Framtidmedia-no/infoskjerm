"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  Megaphone, Monitor, LayoutGrid, Layers, Wifi, WifiOff, RefreshCw, Camera, PencilLine, Tv,
  CalendarClock, TriangleAlert, Flame, PlusCircle, Store, ScrollText, CalendarRange, ChevronRight, Activity, FileText, BarChart3,
} from "lucide-react"
import { pushToScreen, requestNewScreenshot } from "@/app/admin/cms/actions"
import { useTenantConfig } from "@/components/admin/tenant-config-provider"
import { TYPE_META as THUMB_META, isVideoUrl } from "@/app/admin/innhold/_components/content-thumb"
import { isDeckUrl } from "@/lib/content/deck"
import { cn } from "@/lib/utils"
import type { ScreenSync } from "@/lib/xibo/screens"
import { DeckContent, ScreenPill } from "./fleet-decks"
import type { CardSpec, FleetStore, LiveLite, FaultLite, TopPlayLite, ContentHealth, UpcomingLite } from "./types"

/**
 * Seksjonene under coverflowen — RAMMELØSE. Alt svever på den mørke atmosfæren,
 * gruppert med myke lys-pøl som fader ut i svart (ingen harde kanter/bokser),
 * hårfine gradient-skiller og glød. Samme språk som heroen der kortene svever
 * fritt, så siden leser som ett kinematografisk system.
 */

/** Myk lys-pøl som fader til transparent — svever, har ingen hard kant. */
const FIELD: React.CSSProperties = {
  background: "radial-gradient(130% 130% at 50% 0%, rgba(255,255,255,0.04), rgba(255,255,255,0) 66%)",
}

function SectionHeading({ icon: Icon, title, hint }: { icon: typeof Layers; title: string; hint?: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ background: "color-mix(in oklab, var(--brand-primary) 18%, transparent)", color: "color-mix(in oklab, var(--brand-primary) 90%, white)", boxShadow: "0 10px 26px -12px color-mix(in oklab, var(--brand-primary) 75%, transparent)" }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <h2 className="font-display text-[20px] font-bold tracking-tight text-white sm:text-[24px]">{title}</h2>
      {hint && <span className="text-[12px] font-medium text-[#6b6a72]">{hint}</span>}
      <div aria-hidden className="ml-1 hidden h-px flex-1 sm:block" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--brand-primary) 20%, transparent), transparent)" }} />
    </div>
  )
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  slide: { label: "Tilbud", cls: "text-emerald-300 bg-emerald-400/10" },
  news: { label: "Nyhet", cls: "text-sky-300 bg-sky-400/10" },
  competition: { label: "Konkurranse", cls: "text-amber-300 bg-amber-400/10" },
  gallery: { label: "Galleri", cls: "text-fuchsia-300 bg-fuchsia-400/10" },
  invitation: { label: "Invitasjon", cls: "text-rose-300 bg-rose-400/10" },
  ticker: { label: "Ticker", cls: "text-zinc-300 bg-white/8" },
  stats: { label: "Statistikk", cls: "text-cyan-300 bg-cyan-400/10" },
  weather: { label: "Vær", cls: "text-cyan-300 bg-cyan-400/10" },
  job: { label: "Stilling", cls: "text-indigo-300 bg-indigo-400/10" },
  birthday: { label: "Jubilant", cls: "text-pink-300 bg-pink-400/10" },
  html: { label: "HTML-side", cls: "text-violet-300 bg-violet-400/10" },
}
function typeMeta(type: string) {
  return TYPE_META[type] ?? { label: type, cls: "text-zinc-300 bg-white/8" }
}

const SYNC_BADGE: Record<ScreenSync, { label: string; cls: string }> = {
  ok: { label: "Oppdatert", cls: "text-emerald-300 bg-emerald-400/10" },
  downloading: { label: "Laster ned", cls: "text-amber-300 bg-amber-400/10" },
  stale: { label: "Utdatert", cls: "text-rose-300 bg-rose-400/10" },
  unknown: { label: "Ukjent", cls: "text-zinc-400 bg-white/8" },
}

/* ── «Nå på skjermen» — drill-down til aktiv skjerm ───────────────────────── */

type InspectEntry =
  | { key: string; kind: "content"; item: LiveLite }
  | { key: string; kind: "widget"; title: string; typeLabel: string; src: string }

export function NowPlaying({ card, store, heleLabel, showKpi }: { card: CardSpec; store: FleetStore; heleLabel: string; showKpi: boolean }) {
  const { avdelinger, avdelingerIntern } = useTenantConfig()
  const avdLabel = (key: string) =>
    key === "felles" ? heleLabel : avdelinger.find((a) => a.key === key)?.label ?? avdelingerIntern.find((a) => a.key === key)?.label ?? key
  const screen = card.screen
  const sid = encodeURIComponent(store.id)

  // Inspektør-liste: skjermens aktive innhold + KPI-slides (kun internskjerm der
  // tenanten har KPI — Gange-Rolv). KPI vises ALDRI på en kundeskjerm.
  const entries: InspectEntry[] = [
    ...(screen?.content ?? []).map((it): InspectEntry => ({ key: it.id, kind: "content", item: it })),
    ...(screen && card.contentKind === "intern" && showKpi
      ? ([
          { key: "kpi-butikk", kind: "widget", title: "Butikk-KPI", typeLabel: "KPI", src: `/widget/butikk-kpi?store=${sid}` },
          { key: "kpi-uke", kind: "widget", title: "Alle butikker · uke", typeLabel: "Oversikt", src: `/widget/kpi-oversikt?store=${sid}` },
          { key: "kpi-ar", kind: "widget", title: "Alle butikker · hittil i år", typeLabel: "Oversikt", src: `/widget/kpi-oversikt?store=${sid}&periode=ar` },
        ] as InspectEntry[])
      : []),
  ]

  const [sel, setSel] = useState(0)
  useEffect(() => setSel(0), [card.key])
  const idx = Math.min(sel, Math.max(0, entries.length - 1))
  const selected = entries[idx] ?? null
  const previewLandscape = selected?.kind === "widget" ? true : card.orientation === "landscape"

  return (
    <section className="relative z-10 px-4 pt-12 sm:px-8">
      <SectionHeading icon={Monitor} title="Nå på skjermen" hint={screen ? screen.name : "demo-forhåndsvisning"} />
      <div className="grid gap-8 md:grid-cols-[minmax(240px,380px)_1fr] md:gap-10">
        {/* Preview av VALGT linje — klikk et innslag for å se akkurat det */}
        <div className={`relative mx-auto w-full ${previewLandscape ? "max-w-[380px]" : "max-w-[280px]"}`}>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 translate-y-6 scale-90 rounded-[40px] opacity-80 blur-3xl"
            style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand-primary) 60%, transparent), transparent)" }}
          />
          <div
            className="overflow-hidden rounded-[26px] bg-[#0c0c0e]"
            style={{ aspectRatio: previewLandscape ? "16 / 9" : "9 / 16", boxShadow: "0 50px 100px -34px rgba(0,0,0,0.95), 0 0 80px -30px color-mix(in oklab, var(--brand-primary) 60%, transparent)" }}
          >
            {!screen ? (
              <div className="h-full w-full [&>div]:h-full [&>div]:w-full"><DeckContent spec={card} w={card.orientation === "landscape" ? 380 : 280} /></div>
            ) : selected?.kind === "widget" ? (
              <ScaledWidget src={selected.src} portrait={false} />
            ) : selected?.kind === "content" && selected.item.previewData ? (
              <ScaledWidget src={`/widget/preview?d=${selected.item.previewData}&o=${previewLandscape ? "landscape" : "portrait"}`} portrait={!previewLandscape} />
            ) : selected?.kind === "content" ? (
              <LiveThumb imageUrl={selected.item.imageUrl} type={selected.item.type} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center px-4 text-center text-[12px] text-[#55545c]">Ingen aktive innslag på denne skjermen</div>
            )}
          </div>
          {selected && (
            <p className="mt-3 text-center text-[12.5px] font-medium text-[#c9c8d0]">
              {selected.kind === "widget" ? `${selected.title} · oppdateres live` : selected.item.title || "Uten tittel"}
            </p>
          )}
        </div>

        {/* Status + klikkbar liste */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ScreenPill pill={card.pill} big />
            <Chip icon={card.contentKind === "intern" ? Monitor : card.contentKind === "demo" ? LayoutGrid : Megaphone} className={card.contentKind === "intern" ? "text-sky-300 bg-sky-400/10" : card.contentKind === "demo" ? "text-amber-300 bg-amber-400/10" : "text-emerald-300 bg-emerald-400/10"}>
              {card.contentLabel}
            </Chip>
            <Chip icon={Layers} className="text-zinc-300 bg-white/[0.06]">{card.avdeling}</Chip>
          </div>

          {screen ? (
            <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[#8b8a92]">
              <span className="inline-flex items-center gap-1.5">
                {screen.online ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-[#f0616a]" />}
                {screen.online ? "Online" : "Frakoblet"}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SYNC_BADGE[screen.sync].cls}`}>{SYNC_BADGE[screen.sync].label}</span>
              {screen.currentLayout && <span>Viser «{screen.currentLayout}»</span>}
              {screen.lastSeen && <span>Sist sett {screen.lastSeen}</span>}
              {screen.clientVersion && <span>Spiller v{screen.clientVersion}</span>}
            </div>
          ) : (
            <p className="mt-3.5 text-[13px] text-[#8b8a92]">Demo-forhåndsvisning — ingen fysisk skjerm er bundet ennå. Koble en spiller til skjermgruppen «{store.name}» for live-status.</p>
          )}

          <div className="mt-6">
            <p className="mb-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6a72]">
              <Activity className="h-3.5 w-3.5" /> Aktivt nå · {entries.length}
              {entries.length > 0 && <span className="font-medium normal-case tracking-normal text-[#55545c]">— klikk for å forhåndsvise</span>}
            </p>
            {entries.length === 0 ? (
              <p className="py-3 text-[13px] text-[#6b6a72]">Ingen aktive innslag på {store.name} akkurat nå.</p>
            ) : (
              <ul className="max-h-72 divide-y divide-white/[0.05] overflow-y-auto pr-1">
                {entries.map((e, i) => (
                  <InspectRow key={e.key} entry={e} avdLabel={avdLabel} active={i === idx} onClick={() => setSel(i)} />
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {screen ? (
              <>
                <PushButton displayGroupId={screen.displayGroupId} />
                <ShotButton displayId={screen.displayId} />
              </>
            ) : (
              <ActionLink href="/admin/skjermer" icon={Tv}>Koble til skjerm</ActionLink>
            )}
            <ActionLink href="/admin/kundeinnhold" icon={PencilLine}>Rediger innhold</ActionLink>
            <ActionLink href="/admin/skjermer" icon={Tv}>Åpne i Skjermer</ActionLink>
          </div>
        </div>
      </div>
    </section>
  )
}

function InspectRow({ entry, avdLabel, active, onClick }: { entry: InspectEntry; avdLabel: (k: string) => string; active: boolean; onClick: () => void }) {
  const activeStyle = active ? { boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--brand-primary) 32%, transparent)" } : undefined
  const cls = `group -mx-2 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors ${active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"}`
  if (entry.kind === "widget") {
    return (
      <li>
        <button onClick={onClick} className={cls} style={activeStyle}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300"><BarChart3 className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-[#e7e5ea]">{entry.title}</p>
            <p className="truncate text-[11.5px] text-[#6b6a72]">Internt · roterer på skjermen</p>
          </div>
          <span className="shrink-0 rounded-full bg-sky-400/10 px-2 py-0.5 text-[10.5px] font-semibold text-sky-300">{entry.typeLabel}</span>
        </button>
      </li>
    )
  }
  const it = entry.item
  const meta = typeMeta(it.type)
  return (
    <li>
      <button onClick={onClick} className={cls} style={activeStyle}>
        <LiveThumb imageUrl={it.imageUrl} type={it.type} className="h-10 w-10 shrink-0 rounded-lg ring-1 ring-white/10" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-[#e7e5ea]">{it.title || "Uten tittel"}</p>
          <p className="truncate text-[11.5px] text-[#6b6a72]">
            {avdLabel(it.avdeling)}
            {it.validTo ? ` · til ${new Date(it.validTo).toLocaleDateString("nb-NO", { day: "numeric", month: "short" })}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.cls}`}>{meta.label}</span>
      </button>
    </li>
  )
}

/** Skalert live-render av en widget/preview i skjermens orientering — fyller
 * rammen skarpt (samme teknikk som editorens forhåndsvisning). */
function ScaledWidget({ src, portrait }: { src: string; portrait: boolean }) {
  const stageW = portrait ? 1080 : 1920
  const stageH = portrait ? 1920 : 1080
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.2)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / stageW)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [stageW])
  return (
    <div ref={ref} className="relative h-full w-full overflow-hidden bg-black">
      <iframe
        src={src}
        title="Forhåndsvisning"
        scrolling="no"
        tabIndex={-1}
        loading="lazy"
        style={{ position: "absolute", top: 0, left: 0, width: stageW, height: stageH, border: "none", transform: `scale(${scale})`, transformOrigin: "top left" }}
      />
    </div>
  )
}

/* ── Kommende innhold ──────────────────────────────────────────────────────── */

export function Kommende({ upcoming }: { upcoming: UpcomingLite[] }) {
  return (
    <section className="relative z-10 px-4 pt-12 sm:px-8">
      <SectionHeading icon={CalendarClock} title="Kommende" hint="planlagt fram i tid" />
      {upcoming.length === 0 ? (
        <div className="flex items-center gap-3 text-[13px] text-[#6b6a72]">
          <CalendarClock className="h-4 w-4 shrink-0 opacity-50" />
          Ingenting planlagt fram i tid. Publiser med en framtidig startdato for å se det her.
        </div>
      ) : (
        <ol className="relative flex flex-col">
          <div aria-hidden className="absolute bottom-4 left-[27px] top-4 w-px" style={{ background: "linear-gradient(180deg, color-mix(in oklab, var(--brand-primary) 45%, transparent), transparent)" }} />
          {upcoming.map((u) => {
            const meta = typeMeta(u.type)
            const d = new Date(u.validFrom)
            return (
              <li key={u.id} className="group relative -mx-2 flex items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.02]">
                <div className="relative z-10 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl" style={{ background: "color-mix(in oklab, var(--brand-primary) 16%, #0c0c0f)", boxShadow: "0 12px 30px -14px color-mix(in oklab, var(--brand-primary) 60%, transparent)" }}>
                  <span className="font-display text-[19px] font-bold leading-none text-white tabular-nums">{d.toLocaleDateString("nb-NO", { day: "numeric" })}</span>
                  <span className="mt-0.5 text-[9.5px] font-semibold uppercase text-[color-mix(in_oklab,var(--brand-primary)_82%,white)]">{d.toLocaleDateString("nb-NO", { month: "short" })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[#e7e5ea]">{u.title || "Uten tittel"}</p>
                  <p className="text-[11.5px] text-[#6b6a72]">Starter {d.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${meta.cls}`}>{meta.label}</span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

/* ── Flåte-oversikt — svevende fliser, ingen rammer ───────────────────────── */

export function FleetOverview({ stores, activeStoreId, onFocus }: { stores: FleetStore[]; activeStoreId: string; onFocus: (id: string) => void }) {
  const { unitLabelPlural } = useTenantConfig()
  return (
    <section className="relative z-10 px-4 pt-12 sm:px-8">
      <SectionHeading icon={LayoutGrid} title={`Alle ${unitLabelPlural.toLowerCase()}`} hint={`${stores.length}`} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {stores.map((s, i) => {
          const online = s.screens.filter((sc) => sc.online).length
          const active = s.id === activeStoreId
          return (
            <button
              key={s.id}
              onClick={() => onFocus(s.id)}
              className="fx-rise group relative flex flex-col gap-3 overflow-hidden rounded-2xl p-4 text-left transition-all duration-200 hover:-translate-y-0.5"
              style={{
                animationDelay: `${Math.min(i, 8) * 40}ms`,
                background: active ? "radial-gradient(130% 130% at 50% 0%, color-mix(in oklab, var(--brand-primary) 16%, transparent), transparent 68%)" : "transparent",
                boxShadow: active ? "0 0 50px -20px color-mix(in oklab, var(--brand-primary) 75%, transparent)" : "none",
              }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ background: "radial-gradient(130% 130% at 50% 0%, rgba(255,255,255,0.05), transparent 66%)" }} />
              <div className="relative flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-[15px] font-bold text-white">{s.name}</p>
                  {s.city && <p className="truncate text-[12px] text-[#6b6a72]">{s.city}</p>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#55545c] transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="relative flex items-center gap-2">
                {s.screens.length === 0 ? (
                  <span className="text-[12px] text-[#6b6a72]">Ingen skjermer tilkoblet</span>
                ) : (
                  <>
                    <div className="flex gap-1">
                      {s.screens.slice(0, 8).map((sc) => (
                        <span key={sc.displayId} title={sc.name} className={sc.online ? "sf-dot" : ""} style={{ width: 9, height: 9, borderRadius: "50%", background: sc.online ? "#4ade80" : "#f0616a" }} />
                      ))}
                    </div>
                    <span className="text-[12px] font-semibold text-[#8b8a92]">{online}/{s.screens.length} online</span>
                  </>
                )}
              </div>
              <div className="relative flex items-center gap-1.5 text-[11.5px] text-[#6b6a72]">
                <Flame className="h-3.5 w-3.5" style={{ color: "color-mix(in oklab, var(--brand-primary) 82%, white)" }} />
                {s.liveCount} aktive innslag
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ── Drift & innhold — tre kolonner delt av hårfine lys-skiller ───────────── */

export function DriftPanel({ health, faults, topPlays }: { health: ContentHealth; faults: FaultLite[]; topPlays: TopPlayLite[] }) {
  return (
    <section className="relative z-10 px-4 pb-16 pt-12 sm:px-8">
      <SectionHeading icon={Activity} title="Drift & innhold" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-0 lg:[&>*:not(:first-child)]:pl-8 lg:[&>*:not(:last-child)]:pr-8">
        <div>
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6a72]">Innhold</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Metric label="Live" value={health.live} tone="#4ade80" />
            <Metric label="Utløper snart" value={health.expiringSoon} tone="#f6b642" />
            <Metric label="Utkast" value={health.drafts} tone="#a1a1aa" />
            <Metric label="Utløpt" value={health.expired} tone="#f0616a" />
          </div>
          <Link href="/admin/kundeinnhold" className="mt-5 inline-flex items-center gap-1 text-[12px] font-semibold text-[color-mix(in_oklab,var(--brand-primary)_84%,white)] hover:underline">
            Åpne innhold <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="lg:border-l lg:border-white/[0.06]">
          <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6a72]">
            <TriangleAlert className="h-3.5 w-3.5" /> Skjermfeil
          </p>
          {faults.length === 0 ? (
            <div className="flex items-center gap-2 text-[13px] text-emerald-300/90">
              <span className="sf-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80" }} />
              Ingen skjermfeil. Alt spiller som det skal.
            </div>
          ) : (
            <ul className="flex max-h-44 flex-col gap-3 overflow-y-auto pr-1">
              {faults.slice(0, 8).map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px]">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f0616a]" />
                  <span><span className="font-semibold text-[#e7e5ea]">{f.display ?? "Ukjent skjerm"}</span><span className="text-[#6b6a72]"> — {f.description}</span></span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:border-l lg:border-white/[0.06]">
          <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b6a72]">
            <Flame className="h-3.5 w-3.5" /> Mest spilt (7 d)
          </p>
          {topPlays.length === 0 ? (
            <p className="text-[13px] text-[#6b6a72]">Ingen avspillingsstatistikk ennå.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {topPlays.map((p, i) => (
                <li key={i} className="flex items-center justify-between gap-3 text-[12.5px]">
                  <span className="truncate text-[#e7e5ea]">{p.layout}</span>
                  <span className="shrink-0 font-display font-bold tabular-nums text-white">{p.plays}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <QuickActions />
    </section>
  )
}

function QuickActions() {
  const actions: { href: string; label: string; icon: typeof PlusCircle }[] = [
    { href: "/admin/kundeinnhold/ny", label: "Nytt tilbud", icon: PlusCircle },
    { href: "/admin/innhold/ny", label: "Internt innslag", icon: Megaphone },
    { href: "/admin/skjermer", label: "Skjermer", icon: Tv },
    { href: "/admin/plan", label: "Planen", icon: CalendarRange },
    { href: "/admin/stores", label: "Butikker", icon: Store },
    { href: "/admin/logg", label: "Logg", icon: ScrollText },
  ]
  return (
    <div className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {actions.map((a) => {
        const Icon = a.icon
        return (
          <Link key={a.href} href={a.href} className="group flex items-center gap-2.5 rounded-2xl p-3 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.03]">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-110" style={{ background: "color-mix(in oklab, var(--brand-primary) 18%, transparent)", color: "color-mix(in oklab, var(--brand-primary) 88%, white)", boxShadow: "0 10px 24px -14px color-mix(in oklab, var(--brand-primary) 70%, transparent)" }}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-[13px] font-semibold text-[#c9c8d0]">{a.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

/* ── Miniatyr — samme deteksjon som resten av appen + onError-garanti ──────── */

/**
 * Speiler appens ContentThumb (PDF → dokument-ikon, video → poster-frame, bilde
 * → object-cover, uten bilde → type-farget ikon) men legger til onError-fallback,
 * så en brukket URL ALDRI vises som ødelagt bilde.
 */
function LiveThumb({ imageUrl, type, className }: { imageUrl: string | null; type: string; className: string }) {
  const [failed, setFailed] = useState(false)
  const tm = THUMB_META[type] ?? THUMB_META.slide
  const TypeIcon = tm.icon
  const usable = imageUrl && !failed

  if (usable && isDeckUrl(imageUrl!)) {
    return (
      <div className={cn("flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950 text-white/70", className)}>
        <FileText className="h-4 w-4" />
      </div>
    )
  }
  if (usable && isVideoUrl(imageUrl!)) {
    return <video src={`${imageUrl}#t=1`} muted playsInline preload="metadata" onError={() => setFailed(true)} className={cn("bg-zinc-900 object-cover", className)} />
  }
  if (usable) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl!} alt="" onError={() => setFailed(true)} className={cn("object-cover", className)} />
  }
  return (
    <div className={cn("flex items-center justify-center bg-gradient-to-br text-white/90", tm.gradient, className)}>
      <TypeIcon className="h-4 w-4" />
    </div>
  )
}

/* ── Små byggeklosser ──────────────────────────────────────────────────────── */

function Chip({ icon: Icon, className, children }: { icon: typeof Layers; className: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-semibold ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  )
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <div className="font-display text-[30px] font-bold leading-none tabular-nums" style={{ color: tone, textShadow: `0 0 26px color-mix(in oklab, ${tone} 50%, transparent)` }}>{value}</div>
      <div className="mt-1.5 text-[11.5px] font-medium text-[#6b6a72]">{label}</div>
    </div>
  )
}

function ActionLink({ href, icon: Icon, children }: { href: string; icon: typeof Tv; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-[13px] font-semibold text-[#c9c8d0] transition-colors hover:bg-white/[0.09] hover:text-white">
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  )
}

function PushButton({ displayGroupId }: { displayGroupId: number }) {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(async () => {
        const res = await pushToScreen(displayGroupId)
        if (res.ok) toast.success("Skjermene henter nytt innhold nå.")
        else toast.error(res.error ?? "Kunne ikke oppdatere skjermene.")
      })}
      disabled={pending}
      className="fx-btn inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold text-[var(--brand-fg)] transition-transform active:scale-[0.98] disabled:opacity-70"
      style={{ background: "var(--brand-primary)", boxShadow: "0 12px 28px -12px color-mix(in oklab, var(--brand-primary) 85%, transparent)" }}
    >
      <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} /> Oppdater skjermen nå
    </button>
  )
}

function ShotButton({ displayId }: { displayId: number }) {
  const [pending, start] = useTransition()
  return (
    <button
      onClick={() => start(async () => {
        await requestNewScreenshot(displayId)
        toast.success("Ber om nytt skjermbilde — vises i Skjermer straks.")
      })}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-3 py-2 text-[13px] font-semibold text-[#c9c8d0] transition-colors hover:bg-white/[0.09] hover:text-white disabled:opacity-70"
    >
      <Camera className={`h-4 w-4 ${pending ? "animate-pulse" : ""}`} /> Nytt skjermbilde
    </button>
  )
}
