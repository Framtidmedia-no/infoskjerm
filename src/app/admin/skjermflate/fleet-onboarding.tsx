"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RefreshCw, Tv, LayoutGrid, Sparkles, PencilLine, ChevronRight, Flame, X } from "lucide-react"
import { heleEnhetenLabel } from "@/lib/tenant/config"
import { HtmlThumb } from "@/app/admin/innhold/_components/html-thumb"
import { buildDemoCards } from "./build-cards"
import { Coverflow } from "./coverflow"
import { useIsDesktop } from "./use-is-desktop"
import { SectionHeading, typeMeta, LiveThumb, Kommende } from "./fleet-sections"
import type { LiveLite, UpcomingLite } from "./types"

/**
 * Skjermflåte — onboarding-scenen. Vises når tenanten ikke har EN ENESTE skjerm:
 * tom flåte er ikke en feiltilstand, det er første steg. Scenen svarer på «hva
 * gjør jeg nå?» i stedet for å simulere drift: ghost-skjerm + 1-2-3-steg + CTA,
 * og det som faktisk ER ekte (innslagene som ligger klare) brukes som
 * motivasjon. Demo-karusellen finnes fortsatt, men KUN bak eksplisitt
 * «Se eksempel» — vannmerket og uten ekte butikknavn.
 */

export interface FleetOnboardingProps {
  /** Antall aktive innslag (samme tall som stat-kortet ville vist). */
  liveItems: number
  /** Opptil 6 ekte innslag til «Innholdet ditt er klart»-veggen. */
  liveSamples: LiveLite[]
  upcoming: UpcomingLite[]
  userName: string | null
  unitLabel: string
}

export function FleetOnboarding({ liveItems, liveSamples, upcoming, userName, unitLabel }: FleetOnboardingProps) {
  const router = useRouter()
  const isDesktop = useIsDesktop()
  const [refreshing, startRefresh] = useTransition()
  const [showDemo, setShowDemo] = useState(false)
  const [demoActive, setDemoActive] = useState(0)
  const heleLabel = heleEnhetenLabel(unitLabel)
  const demoCards = useMemo(() => buildDemoCards(heleLabel), [heleLabel])

  const handleRefresh = () => {
    startRefresh(() => router.refresh())
    toast.success("Ser etter tilkoblede skjermer …")
  }

  const steps: { title: string; text: string }[] = [
    { title: "Sett opp skjermen", text: "Koble spilleren til strøm og nett — den melder seg inn i flåten selv." },
    { title: `Bind den til riktig ${unitLabel.toLowerCase()}`, text: "Under Skjermer velger du hvor den henger og hva slags flate den er." },
    { title: "Innholdet spilles automatisk", text: "Alt som ligger klart vises med en gang — og du følger det live herfra." },
  ]

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
            {userName ? `${userName} — koble` : "Koble"} til en skjerm, så viser denne siden nøyaktig hva den spiller — i sanntid.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-[12px] font-semibold text-[#8b8a92]">
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6b6a72" }} />
            Ingen skjermer tilkoblet
          </span>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            title="Se etter nylig tilkoblede skjermer"
            className="fx-btn flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-[var(--brand-fg)] transition-transform active:scale-[0.98] disabled:opacity-70"
            style={{ background: "var(--brand-primary)", boxShadow: "0 10px 26px -10px color-mix(in oklab, var(--brand-primary) 85%, transparent)" }}
          >
            <RefreshCw className={`h-[15px] w-[15px] ${refreshing ? "animate-spin" : ""}`} />
            Oppdater
          </button>
        </div>
      </header>

      {/* ── Hero: hva nå + ghost-skjerm ────────────────────────────────────── */}
      <section className="relative z-10 grid items-center gap-10 px-4 pb-4 pt-10 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:gap-16 lg:px-16">
        <div className="max-w-xl">
          <h2 className="font-display text-[30px] font-bold leading-[1.05] tracking-tight text-white sm:text-[40px]">
            Ingen skjermer
            <br />
            koblet til ennå
          </h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-[#8b8a92]">
            Når den første skjermen er på plass blir dette kommandosentralen din: du ser hva hver skjerm spiller akkurat nå,
            hvem som er online, og hva som står for tur.
          </p>

          <ol className="mt-8 flex flex-col gap-5">
            {steps.map((s, i) => (
              <li key={s.title} className="fx-rise flex items-start gap-4" style={{ animationDelay: `${i * 90}ms` }}>
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold"
                  style={{
                    background: "color-mix(in oklab, var(--brand-primary) 18%, transparent)",
                    color: "color-mix(in oklab, var(--brand-primary) 90%, white)",
                    boxShadow: "0 10px 26px -12px color-mix(in oklab, var(--brand-primary) 75%, transparent)",
                  }}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-[14px] font-bold text-[#e7e5ea]">{s.title}</p>
                  <p className="mt-0.5 text-[13px] leading-relaxed text-[#8b8a92]">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/admin/skjermer"
              className="fx-btn inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-bold text-[var(--brand-fg)] transition-transform active:scale-[0.98]"
              style={{ background: "var(--brand-primary)", boxShadow: "0 14px 32px -12px color-mix(in oklab, var(--brand-primary) 85%, transparent)" }}
            >
              <Tv className="h-4 w-4" />
              Koble til din første skjerm
            </Link>
            {/* Coverflow-en (3D/blur) rendres aldri på mobil (iOS-OOM) — knappen følger med. */}
            {isDesktop && (
              <button
                onClick={() => setShowDemo((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-3 text-[13.5px] font-semibold text-[#c9c8d0] transition-colors hover:bg-white/[0.09] hover:text-white"
              >
                {showDemo ? <X className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                {showDemo ? "Skjul eksempel" : "Se eksempel"}
              </button>
            )}
          </div>
        </div>

        <GhostScreen />
      </section>

      {/* ── Eksempelvisning — kun ved eksplisitt valg, tydelig vannmerket ──── */}
      {showDemo && isDesktop && (
        <section className="relative z-10 pt-6">
          <Coverflow
            cards={demoCards}
            active={demoActive}
            onActive={setDemoActive}
            footer="Eksempelvisning med fiktivt innhold — slik ser flåten ut når skjermer er koblet til"
          />
        </section>
      )}

      {/* ── Det som ER ekte: innholdet som ligger klart ────────────────────── */}
      <section className="relative z-10 px-4 pb-16 pt-12 sm:px-8">
        {liveItems > 0 ? (
          <>
            <SectionHeading icon={Sparkles} title="Innholdet ditt er klart" hint={`${liveItems} innslag venter på en skjerm`} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {liveSamples.map((it, i) => (
                <div key={it.id} className="fx-rise group overflow-hidden rounded-2xl bg-white/[0.03]" style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}>
                  <div className="aspect-[9/12] overflow-hidden">
                    {it.type === "html" ? (
                      <HtmlThumb id={it.id} portrait className="h-full w-full" />
                    ) : (
                      <LiveThumb imageUrl={it.imageUrl} type={it.type} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 p-3">
                    <p className="truncate text-[12.5px] font-semibold text-[#e7e5ea]">{it.title || "Uten tittel"}</p>
                    <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeMeta(it.type).cls}`}>{typeMeta(it.type).label}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/admin/kundeinnhold" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[color-mix(in_oklab,var(--brand-primary)_84%,white)] hover:underline">
                Åpne innhold <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </>
        ) : (
          <>
            <SectionHeading icon={Flame} title="Start med innholdet" hint="klart til visning fra dag én" />
            <p className="max-w-lg text-[13.5px] leading-relaxed text-[#8b8a92]">
              Ingen innslag ennå. Lag det første nå, så ligger det klart og spilles automatisk i det øyeblikket en skjerm kobles til.
            </p>
            <Link
              href="/admin/kundeinnhold/ny"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/[0.05] px-4 py-2.5 text-[13px] font-semibold text-[#c9c8d0] transition-colors hover:bg-white/[0.09] hover:text-white"
            >
              <PencilLine className="h-4 w-4" />
              Lag ditt første innslag
            </Link>
          </>
        )}
      </section>

      {upcoming.length > 0 && (
        <div className="relative z-10 pb-16 -mt-4">
          <Kommende upcoming={upcoming} />
        </div>
      )}
    </div>
  )
}

/* ── Ghost-skjermen: wireframe av en stående skjerm som venter ─────────────── */

function GhostScreen() {
  return (
    <div className="relative mx-auto hidden md:block" aria-hidden>
      {/* Glød bak kortet */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 translate-y-8 scale-110 rounded-[40px] opacity-70 blur-3xl"
        style={{ background: "radial-gradient(closest-side, color-mix(in oklab, var(--brand-primary) 45%, transparent), transparent)" }}
      />
      <div
        className="sf-float-a relative flex h-[420px] w-[240px] flex-col rounded-[26px] border-2 border-dashed border-white/[0.14] p-5"
        style={{ background: "linear-gradient(165deg, rgba(22,22,28,0.75), rgba(12,12,16,0.6))", boxShadow: "0 50px 100px -34px rgba(0,0,0,0.9)" }}
      >
        {/* Wireframe-topbar */}
        <div className="flex items-center justify-between">
          <span className="h-2 w-16 rounded-full bg-white/[0.1]" />
          <span className="h-2 w-8 rounded-full bg-white/[0.07]" />
        </div>
        {/* Midt: venter på skjerm */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <span
            className="flex h-16 w-16 items-center justify-center rounded-2xl"
            style={{
              background: "color-mix(in oklab, var(--brand-primary) 16%, transparent)",
              color: "color-mix(in oklab, var(--brand-primary) 88%, white)",
              boxShadow: "0 16px 40px -16px color-mix(in oklab, var(--brand-primary) 80%, transparent)",
            }}
          >
            <Tv className="h-7 w-7" />
          </span>
          <p className="text-center text-[12px] font-semibold leading-relaxed text-[#6b6a72]">
            Din første skjerm
            <br />
            vises her
          </p>
        </div>
        {/* Wireframe-innholdslinjer */}
        <div className="flex flex-col gap-2">
          <span className="h-2 w-3/4 rounded-full bg-white/[0.09]" />
          <span className="h-2 w-1/2 rounded-full bg-white/[0.06]" />
        </div>
      </div>
    </div>
  )
}
