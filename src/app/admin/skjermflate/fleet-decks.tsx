"use client"

/**
 * Skjermflåte — de svevende «decksene» i 3D-veggen.
 *
 * Hvert deck viser ENTEN det ekte innholdet skjermen spiller (en skalert
 * /widget/*-iframe — nøyaktig samme kilde Xibo embedder), ELLER et kuratert
 * demo-innhold når butikken ikke har noe live ennå. Demo-decks er tydelig
 * merket «Demo» via skjerm-pillen, så det aldri forveksles med live drift.
 *
 * Live-thumbnailen bruker samme skalerings-teknikk som screen-preview.tsx:
 * iframe rendres i full skjermoppløsning (1080×1920 / 1920×1080) og skaleres
 * ned til kortets størrelse — da blir mini-rendringen skarp, ikke uskarp.
 */

import type { DeckPillData, CardSpec } from "./types"

const STAGE_PORTRAIT = { w: 1080, h: 1920 }
const STAGE_LANDSCAPE = { w: 1920, h: 1080 }

/** Skarp mini-render av en ekte widget: full oppløsning skalert til kortet. */
function WidgetThumb({ src, w, portrait }: { src: string; w: number; portrait: boolean }) {
  const stage = portrait ? STAGE_PORTRAIT : STAGE_LANDSCAPE
  const scale = w / stage.w
  const h = w * (stage.h / stage.w)
  return (
    <div style={{ width: w, height: h, overflow: "hidden", position: "relative", background: "#000" }}>
      <iframe
        src={src}
        title="Live skjerminnhold"
        scrolling="no"
        tabIndex={-1}
        loading="lazy"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: stage.w,
          height: stage.h,
          border: "none",
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      />
    </div>
  )
}

/* ── Skjerm-pille: ekte enhetsnavn + tilkoblingsstatus (eller «Demo») ─────── */

export function ScreenPill({ pill, big = false }: { pill: DeckPillData; big?: boolean }) {
  const dot =
    pill.state === true
      ? { bg: "#4ade80", cls: "sf-dot" }
      : pill.state === false
        ? { bg: "#f0616a", cls: "" }
        : { bg: "#f6b642", cls: "" }
  const statusText =
    pill.sub ?? (pill.state === true ? "Online" : pill.state === false ? "Frakoblet" : "Demo")
  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(20,20,24,0.86)] shadow-[0_10px_28px_rgba(0,0,0,0.55)] backdrop-blur-md"
      style={{ padding: big ? "9px 14px" : "7px 12px" }}
    >
      <span
        className={dot.cls}
        style={{ width: big ? 9 : 8, height: big ? 9 : 8, borderRadius: "50%", background: dot.bg, flex: "none" }}
      />
      <span className="font-semibold text-[#f4f3f5]" style={{ fontSize: big ? 13 : 12 }}>
        {pill.label}
      </span>
      <span className="text-[#8b8a92]" style={{ fontSize: big ? 12 : 11 }}>
        · {statusText}
      </span>
    </div>
  )
}

/* ── OFFER (stående) — Sommersalg / tilbud ────────────────────────────────── */

export function OfferBody({ live, src, w, store }: { live: boolean; src?: string; w: number; store: string }) {
  if (live && src) return <WidgetThumb src={src} w={w} portrait />
  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#0c0c0d" }}>
      <div className="flex items-center justify-between px-3" style={{ height: 44 }}>
        <span className="text-[11px] font-extrabold uppercase text-white">{store}</span>
        <span className="font-display text-[11px] font-bold text-[#b8b4bd] tabular-nums">19:11</span>
      </div>
      <div
        className="flex flex-1 flex-col justify-center px-5"
        style={{ background: "linear-gradient(165deg, var(--brand-primary), color-mix(in oklab, var(--brand-primary) 55%, #000))" }}
      >
        <div className="text-[12px] font-extrabold uppercase tracking-[0.14em]" style={{ color: "color-mix(in oklab, var(--brand-fg) 85%, transparent)" }}>
          Sommersalg
        </div>
        <div className="font-display font-bold leading-[0.82] tracking-tight" style={{ color: "var(--brand-fg)", fontSize: 84, marginTop: 6 }}>
          −30%
        </div>
        <div className="mt-3 text-[14px] font-semibold leading-snug" style={{ color: "color-mix(in oklab, var(--brand-fg) 92%, transparent)" }}>
          på utvalgte grillvarer
        </div>
      </div>
    </div>
  )
}

/* ── NEWS flagship (liggende) — kundeavis / Kystfrost ─────────────────────── */

export function NewsBody({
  live,
  src,
  w,
  store,
  clock,
  dateLabel,
  ticker,
}: {
  live: boolean
  src?: string
  w: number
  store: string
  clock: string
  dateLabel: string
  ticker: string
}) {
  if (live && src) return <WidgetThumb src={src} w={w} portrait={false} />
  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#0c0c0d" }}>
      <div className="flex items-center justify-between px-5" style={{ height: 58 }}>
        <div>
          <div className="text-[9px] font-bold uppercase leading-none tracking-[0.2em] text-emerald-400/90">Gange-Rolv</div>
          <div className="mt-1 text-[21px] font-extrabold leading-tight text-white">{store}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[20px] font-bold text-white">
            <span style={{ fontSize: 18 }}>⛅</span>16°
          </div>
          <div className="text-right">
            <div className="font-display text-[24px] font-bold leading-none text-white tabular-nums">{clock}</div>
            <div className="mt-0.5 text-[9px] font-semibold text-zinc-400">{dateLabel}</div>
          </div>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden px-6 py-4" style={{ background: "linear-gradient(180deg,#eef2f5,#d8e4ed)" }}>
        <div className="text-[10px] font-semibold tracking-wide text-[#5b6b78]">29. juni 2026 · Frank Lunde</div>
        <div className="mt-2 text-[26px] font-extrabold leading-[1.03] tracking-tight text-[#0e1b26]">
          4 KYSTFROST
          <br />
          PRODUKTER KLARE
        </div>
        <div className="mt-2.5 text-[11px] font-semibold leading-[1.7] text-[#33505f]">
          Reker 40/60 · EPD 6987846
          <br />
          Reker 70/90 · EPD 7001787
          <br />
          Fryste lakseporsjoner · EPD 7008907
        </div>
        <div className="pointer-events-none absolute bottom-0.5 right-[-6px] font-display text-[52px] font-bold italic leading-none" style={{ color: "rgba(95,140,180,0.28)" }}>
          Kystfrost
        </div>
      </div>
      <div className="flex items-center gap-3 overflow-hidden px-4" style={{ height: 32, background: "var(--brand-primary)" }}>
        <span className="flex-none rounded-full px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide" style={{ color: "var(--brand-fg)", background: "rgba(255,255,255,0.2)" }}>
          ● Nytt
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="sf-ticker whitespace-nowrap">
            <span className="text-[12px] font-semibold" style={{ color: "var(--brand-fg)" }}>
              {ticker}&nbsp;·&nbsp;&nbsp;&nbsp;{ticker}&nbsp;·&nbsp;&nbsp;&nbsp;
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── MENU (stående kort) — Ferskvaredisk / Dagens fangst ──────────────────── */

const MENU_ITEMS: ReadonlyArray<[string, string]> = [
  ["Reker 40/60", "189,-"],
  ["Fersk laks", "159,-"],
  ["Kongekrabbe", "349,-"],
  ["Blåskjell", "89,-"],
]

export function MenuBody() {
  return (
    <div className="h-full w-full p-5" style={{ background: "#131217" }}>
      <div className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: "color-mix(in oklab, var(--brand-primary) 78%, #ff8a90)" }}>
        Ferskvaredisk
      </div>
      <div className="font-display mt-2 text-[24px] font-bold leading-none text-white">Dagens fangst</div>
      <div className="mt-4 flex flex-col gap-3">
        {MENU_ITEMS.map(([name, price], i) => (
          <div
            key={name}
            className="flex items-center justify-between pb-2"
            style={{ borderBottom: i < MENU_ITEMS.length - 1 ? "1px dashed rgba(255,255,255,0.12)" : "none" }}
          >
            <span className="text-[13px] font-semibold text-[#e7e5ea]">{name}</span>
            <span className="font-display text-[14px] font-bold text-white tabular-nums">{price}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── HOURS (liten liggende, bak) — Åpent i dag ────────────────────────────── */

export function HoursBody({ hours }: { hours: string }) {
  return (
    <div
      className="flex h-full w-full flex-col justify-between p-6"
      style={{ background: "linear-gradient(155deg,#1a1c22,#0d0e12)" }}
    >
      <div className="text-[11px] font-extrabold uppercase tracking-[0.18em]" style={{ color: "color-mix(in oklab, var(--brand-primary) 78%, #ff8a90)" }}>
        Åpningstider
      </div>
      <div>
        <div className="font-display text-[44px] font-bold leading-[0.9] text-white">ÅPENT</div>
        <div className="font-display text-[44px] font-bold leading-[0.9] text-white">I DAG</div>
      </div>
      <div className="text-[15px] font-semibold text-[#b8b4bd]">{hours}</div>
    </div>
  )
}

/* ── Samlet portrett-innhold for coverflow-kort: live-widget eller demo ────── */

/** Lett placeholder for et live-kort som IKKE er i fokus — ingen iframe. */
function LivePlaceholder() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" style={{ background: "linear-gradient(160deg, #141418, #0b0b0e)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 38%, color-mix(in oklab, var(--brand-primary) 24%, transparent), transparent 70%)" }} />
      <div className="relative flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 backdrop-blur-sm">
        <span className="sf-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
        <span className="text-[11px] font-semibold text-[#c9c8d0]">Live</span>
      </div>
    </div>
  )
}

/** Rendrer ett coverflow-korts innhold: ekte /widget-render (i skjermens
 * orientering) eller demo-deck. `w` = kortets bredde; høyden gir seg av
 * orienteringen (stående 9:16, liggende 16:9).
 *
 * `active`: KUN det aktive (senter) kortet laster live-iframe. Ellers mounter
 * coverflow-en mange tunge /widget-iframes samtidig → iOS Safari/PWA OOM-krasj.
 * Sidekort får en lett placeholder; iframen lastes når kortet blir senter.
 *
 * Demo-decks vannmerkes med «EKSEMPEL» rett på flaten — pillen alene er for
 * lett å overse, og fabrikkert innhold skal aldri kunne leses som live drift. */
export function DeckContent({ spec, w, active = true }: { spec: CardSpec; w: number; active?: boolean }) {
  if (spec.live && spec.src) return active ? <WidgetThumb src={spec.src} w={w} portrait={spec.orientation === "portrait"} /> : <LivePlaceholder />
  const body =
    spec.demo === "menu" ? <MenuBody /> : spec.demo === "hours" ? <HoursBody hours="Man–søn · 07–23" /> : <OfferBody live={false} w={w} store={spec.store} />
  return (
    <div className="relative h-full w-full">
      {body}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-hidden">
        <span
          className="-rotate-[24deg] whitespace-nowrap font-display text-[24px] font-black uppercase tracking-[0.42em] text-white/[0.16]"
          style={{ textShadow: "0 2px 18px rgba(0,0,0,0.45)" }}
        >
          Eksempel
        </span>
      </div>
    </div>
  )
}
