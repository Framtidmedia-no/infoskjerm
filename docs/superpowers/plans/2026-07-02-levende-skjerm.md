# Levende skjerm — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gi alle skjermflater (nyheter/tilbud/kampanje) ekte crossfade mellom kort, levende kjedefarget bakgrunn, kjedefarge-chrome i stedet for hardkodet grønn, «Slutter snart»-puls på utløpende tilbud, og feature-flagget sesongatmosfære — uten å brekke noe som fungerer i dag.

**Architecture:** Delte presentasjonskomponenter i `src/app/widget/_shared/` (SceneTransition, AmbientBackdrop, SeasonLayer) + ren logikk i `period.ts`/`season.ts`, plugget inn i de tre eksisterende rotatorene. Ingen DB-skjemaendring — kun ett nytt feature-flagg (`seasonThemes` i `tenants.features`). Kun `transform`/`opacity` animeres (Raspberry Pi er ytelsesgulvet).

**Tech Stack:** Next.js App Router (widgets = server page + client rotator), React inline-styles + inline `<style>`-keyframes (etablert mønster), vitest for ren logikk, Playwright for visuell verifisering.

**Spec:** `docs/superpowers/specs/2026-07-02-levende-skjerm-design.md`

**Franks krav:** «Trygt! alt fungerer i dag» — hver task skal være additiv/kirurgisk; fallback uten kjede = dagens grønn `#16a34a` (null visuell endring der).

**Viktig kontekst for utfører:**
- Arbeidet skjer i worktree `.worktrees/levende-skjerm` på branch `feat/levende-skjerm` (fra `main`).
- `fx-*`-klassene i `globals.css` finnes IKKE på main (de ligger på en annen branch) — alle nye keyframes skal være selvstendige inline `<style>`-blokker i komponentene, slik rotatorene allerede gjør.
- `tokens.ts` sin `KEYFRAMES`-streng (med `wPulse`) FINNES på main og gjenbrukes.
- Kjør kommandoer fra worktree-rota. Repoet har både `package-lock.json` og `pnpm-lock.yaml` — bruk `npx`/`npm run` konsekvent.
- Commit etter hver task (kun filene tasken nevner — aldri `git add -A`).

---

## Task 1: `period.ts` — delt periode- og «slutter snart»-logikk (TDD)

**Files:**
- Create: `src/app/widget/_shared/period.ts`
- Test: `src/app/widget/_shared/period.test.ts`

Dagens `formatPeriod` er duplisert i alle tre rotatorer — den flyttes hit (identisk oppførsel). Ny `expiryLabel` gir «Slutter i dag / i morgen / snart» innen 48 timer.

- [ ] **Step 1: Skriv de feilende testene**

```ts
// src/app/widget/_shared/period.test.ts
import { describe, expect, it } from "vitest"
import { expiryLabel, formatPeriod } from "./period"

describe("expiryLabel", () => {
  const now = new Date("2026-07-02T10:00:00")
  it("null uten validTo", () => {
    expect(expiryLabel(null, now)).toBeNull()
  })
  it("null når det er mer enn 48 timer igjen", () => {
    expect(expiryLabel("2026-07-10", now)).toBeNull()
  })
  it("null når tilbudet er utløpt", () => {
    expect(expiryLabel("2026-07-01", now)).toBeNull()
  })
  it("«Slutter i dag» samme kalenderdag", () => {
    expect(expiryLabel("2026-07-02", now)).toBe("Slutter i dag")
  })
  it("dato uten klokkeslett gjelder UT dagen (23:59)", () => {
    expect(expiryLabel("2026-07-02", new Date("2026-07-02T23:00:00"))).toBe("Slutter i dag")
  })
  it("«Slutter i morgen» neste kalenderdag", () => {
    expect(expiryLabel("2026-07-03", now)).toBe("Slutter i morgen")
  })
  it("«Slutter snart» to kalenderdager fram men innen 48 t", () => {
    expect(expiryLabel("2026-07-04T08:00:00", now)).toBe("Slutter snart")
  })
  it("null ved ugyldig dato", () => {
    expect(expiryLabel("tull", now)).toBeNull()
  })
})

describe("formatPeriod", () => {
  it("null uten datoer", () => {
    expect(formatPeriod(null, null)).toBeNull()
  })
  it("fra–til", () => {
    expect(formatPeriod("2026-07-01", "2026-07-04")).toBe("Gjelder 1. juli – 4. juli")
  })
  it("kun til", () => {
    expect(formatPeriod(null, "2026-07-04")).toBe("Gjelder til 4. juli")
  })
})
```

- [ ] **Step 2: Kjør testen — den skal FEILE**

Run: `npx vitest run src/app/widget/_shared/period.test.ts`
Expected: FAIL — «Cannot find module './period'» (eller tilsvarende).

- [ ] **Step 3: Skriv implementasjonen**

```ts
// src/app/widget/_shared/period.ts
/**
 * Delt periode-logikk for skjermkortene. `formatPeriod` er flyttet hit fra
 * rotatorene (identisk oppførsel). `expiryLabel` gir «Slutter snart»-status:
 * satt når validTo er innen 48 timer — en ren dato (uten klokkeslett) regnes
 * som gyldig UT dagen, slik kunden leser «Gjelder til 4. juli».
 */

const URGENT_HOURS = 48
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const f = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
  if (from && to) return `Gjelder ${f(from)} – ${f(to)}`
  if (from) return `Gjelder fra ${f(from)}`
  return `Gjelder til ${f(to!)}`
}

/** «Slutter i dag / i morgen / snart» når validTo er innen 48 t, ellers null. */
export function expiryLabel(validTo: string | null, now: Date = new Date()): string | null {
  if (!validTo) return null
  const raw = validTo.trim()
  const end = DATE_ONLY.test(raw) ? new Date(raw + "T23:59:59") : new Date(raw)
  if (Number.isNaN(end.getTime())) return null
  const msLeft = end.getTime() - now.getTime()
  if (msLeft <= 0 || msLeft > URGENT_HOURS * 3_600_000) return null
  const dayDiff = calendarDayDiff(now, end)
  if (dayDiff <= 0) return "Slutter i dag"
  if (dayDiff === 1) return "Slutter i morgen"
  return "Slutter snart"
}

function calendarDayDiff(a: Date, b: Date): number {
  const at = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const bt = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((bt - at) / 86_400_000)
}
```

- [ ] **Step 4: Kjør testen — den skal PASSE**

Run: `npx vitest run src/app/widget/_shared/period.test.ts`
Expected: PASS (11 tester).

- [ ] **Step 5: Commit**

```bash
git add src/app/widget/_shared/period.ts src/app/widget/_shared/period.test.ts
git commit -m "feat(skjerm): delt periode-logikk med «Slutter snart»-status (48 t)"
```

---

## Task 2: `season.ts` — dato-styrte sesongtemaer (TDD)

**Files:**
- Create: `src/lib/season.ts`
- Test: `src/lib/season.test.ts`

- [ ] **Step 1: Skriv de feilende testene**

```ts
// src/lib/season.test.ts
import { describe, expect, it } from "vitest"
import { activeSeason, parseSeasonKey } from "./season"

describe("activeSeason", () => {
  it("jul i desember", () => {
    expect(activeSeason(new Date("2026-12-15"))?.key).toBe("jul")
  })
  it("jul håndterer årsskiftet (1. januar)", () => {
    expect(activeSeason(new Date("2027-01-01"))?.key).toBe("jul")
  })
  it("ingen sesong 2. januar", () => {
    expect(activeSeason(new Date("2027-01-02"))).toBeNull()
  })
  it("syttendemai 16. mai", () => {
    expect(activeSeason(new Date("2026-05-16"))?.key).toBe("syttendemai")
  })
  it("sommer i juli, med varm tint", () => {
    const s = activeSeason(new Date("2026-07-02"))
    expect(s?.key).toBe("sommer")
    expect(s?.tint).toBeTruthy()
  })
  it("ingen sesong i mars", () => {
    expect(activeSeason(new Date("2026-03-01"))).toBeNull()
  })
})

describe("parseSeasonKey", () => {
  it("gyldig nøkkel gir sesong med tint", () => {
    expect(parseSeasonKey("jul")?.key).toBe("jul")
  })
  it("ukjent nøkkel gir null", () => {
    expect(parseSeasonKey("halloween")).toBeNull()
    expect(parseSeasonKey(undefined)).toBeNull()
  })
})
```

- [ ] **Step 2: Kjør testen — den skal FEILE**

Run: `npx vitest run src/lib/season.test.ts`
Expected: FAIL — modul finnes ikke.

- [ ] **Step 3: Skriv implementasjonen**

```ts
// src/lib/season.ts
/**
 * Dato-styrte sesongtemaer for skjermflatene («Levende skjerm»). Ren funksjon
 * uten side-effekter — testbar og SSR-trygg. Gates per tenant via feature-
 * flagget `seasonThemes` (src/lib/tenant/features.ts) i widget-pagene.
 * Datovinduene er systemkonstanter (known non-CMS, se spec).
 */

export type SeasonKey = "jul" | "syttendemai" | "sommer"

export interface Season {
  key: SeasonKey
  /** Valgfri tonefarge som blandes inn i AmbientBackdrop-gløden. */
  tint: string | null
}

/** [måned 1–12, dag]. `from > to` betyr at vinduet krysser årsskiftet. */
interface SeasonWindow {
  key: SeasonKey
  tint: string | null
  from: [number, number]
  to: [number, number]
}

const WINDOWS: SeasonWindow[] = [
  { key: "syttendemai", tint: null, from: [5, 15], to: [5, 17] },
  { key: "jul", tint: "#7dd3fc", from: [12, 1], to: [1, 1] },
  { key: "sommer", tint: "#fbbf24", from: [6, 1], to: [8, 31] },
]

export function activeSeason(now: Date = new Date()): Season | null {
  const md = (now.getMonth() + 1) * 100 + now.getDate()
  for (const w of WINDOWS) {
    const from = w.from[0] * 100 + w.from[1]
    const to = w.to[0] * 100 + w.to[1]
    const hit = from <= to ? md >= from && md <= to : md >= from || md <= to
    if (hit) return { key: w.key, tint: w.tint }
  }
  return null
}

/** Preview-override (`?season=jul`) — kun kjente nøkler slipper gjennom. */
export function parseSeasonKey(raw: string | null | undefined): Season | null {
  const w = WINDOWS.find((x) => x.key === raw)
  return w ? { key: w.key, tint: w.tint } : null
}
```

- [ ] **Step 4: Kjør testen — den skal PASSE**

Run: `npx vitest run src/lib/season.test.ts`
Expected: PASS (8 tester).

- [ ] **Step 5: Commit**

```bash
git add src/lib/season.ts src/lib/season.test.ts
git commit -m "feat(skjerm): dato-styrte sesongtemaer (jul, 17. mai, sommer)"
```

---

## Task 3: `hexAlpha` i tokens + `AmbientBackdrop`

**Files:**
- Modify: `src/app/widget/_shared/tokens.ts` (legg til `hexAlpha` nederst)
- Create: `src/app/widget/_shared/ambient-backdrop.tsx`

- [ ] **Step 1: Legg til `hexAlpha` nederst i `tokens.ts`**

```ts
/** Hex (#rgb/#rrggbb) → rgba() med gitt alpha. Ugyldig farge → grønn fallback,
 *  aldri undefined-styling (kjedefarger kommer fra DB og kan være hva som helst). */
export function hexAlpha(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return "rgba(22,163,74," + alpha + ")"
  let h = m[1]
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const n = parseInt(h, 16)
  return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + alpha + ")"
}
```

- [ ] **Step 2: Skriv `AmbientBackdrop`**

```tsx
// src/app/widget/_shared/ambient-backdrop.tsx
"use client"

import type { CSSProperties } from "react"
import { hexAlpha } from "./tokens"

/**
 * Levende, kjedefarget bakgrunn bak alle kort («Levende skjerm»). To store,
 * ferdig-myke radial-gradient-blobs i aksentfargen drifter sakte med transform
 * (aldri animert filter/blur — Raspberry Pi er ytelsesgulvet), over en mørk
 * basisgradient, med et statisk korn-lag (ren lav opacity, bevisst IKKE
 * mix-blend-mode: blend over animerte lag tvinger kontinuerlig re-kompositt).
 * Legges BAKERST i rotator-framen; kort med egen bakgrunn dekker den.
 */

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")"

const KEYFRAMES = "@keyframes lsDriftA{from{transform:translate3d(-6%,-4%,0) scale(1)}to{transform:translate3d(5%,6%,0) scale(1.15)}}@keyframes lsDriftB{from{transform:translate3d(4%,6%,0) scale(1.1)}to{transform:translate3d(-5%,-5%,0) scale(1)}}@media (prefers-reduced-motion: reduce){.ls-blob{animation:none!important}}"

const blobBase: CSSProperties = { position: "absolute", inset: "-20%", pointerEvents: "none", willChange: "transform" }

export function AmbientBackdrop({ accent = "#16a34a", tint = null, intensity = "normal" }: { accent?: string; tint?: string | null; intensity?: "subtle" | "normal" }) {
  const a = intensity === "subtle" ? 0.1 : 0.16
  const blobA = "radial-gradient(46% 38% at 78% 12%, " + hexAlpha(accent, a) + ", transparent 70%)"
  const blobB = "radial-gradient(42% 40% at 16% 86%, " + hexAlpha(tint || accent, a * 0.75) + ", transparent 70%)"
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(135deg,#0a0a0c,#141418)" }}>
      <style>{KEYFRAMES}</style>
      <div className="ls-blob" style={{ ...blobBase, background: blobA, animation: "lsDriftA 26s ease-in-out infinite alternate" }} />
      <div className="ls-blob" style={{ ...blobBase, background: blobB, animation: "lsDriftB 34s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, opacity: 0.05, pointerEvents: "none" }} />
    </div>
  )
}
```

- [ ] **Step 3: Verifiser at det kompilerer**

Run: `npx tsc --noEmit` og se at det ikke kommer feil for `ambient-backdrop`/`tokens`.

- [ ] **Step 4: Commit**

```bash
git add src/app/widget/_shared/tokens.ts src/app/widget/_shared/ambient-backdrop.tsx
git commit -m "feat(skjerm): AmbientBackdrop — levende kjedefarget bakgrunn (Pi-vennlig)"
```

---

## Task 4: `SceneTransition` — ekte crossfade + preload

**Files:**
- Create: `src/app/widget/_shared/scene-transition.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
// src/app/widget/_shared/scene-transition.tsx
"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import type { LiveItem } from "@/lib/content/live"

/**
 * Ekte crossfade mellom kort («Levende skjerm»): forrige kort holdes montert i
 * overgangstiden og fader ut med lett nedskalering, mens nytt kort fader inn
 * med et lite løft. Maks 2 kort i DOM samtidig; kun transform/opacity animeres
 * (Raspberry Pi er ytelsesgulvet). Fyller nærmeste posisjonerte forelder —
 * rotatoren eier plasseringen (f.eks. plass til ticker i bunn).
 */

const TRANSITION_MS = 800

const KEYFRAMES = "@keyframes lsSceneIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes lsSceneOut{from{opacity:1;transform:scale(1)}to{opacity:0;transform:scale(.985)}}@media (prefers-reduced-motion: reduce){.ls-scene{animation:none!important}}"

const IN_ANIM = "lsSceneIn " + TRANSITION_MS + "ms cubic-bezier(.16,1,.3,1)"
const OUT_ANIM = "lsSceneOut " + TRANSITION_MS + "ms ease-out forwards"

interface Scene {
  key: string
  node: ReactNode
}

export function SceneTransition({ itemKey, children }: { itemKey: string; children: ReactNode }) {
  const [prev, setPrev] = useState<Scene | null>(null)
  const lastRef = useRef<Scene>({ key: itemKey, node: children })

  // Betinget setState under render — Reacts offisielle mønster for derivert
  // state: fanger forrige kort idet nøkkelen bytter, uten effekt-lag.
  if (lastRef.current.key !== itemKey) {
    setPrev(lastRef.current)
  }
  lastRef.current = { key: itemKey, node: children }

  useEffect(() => {
    if (!prev) return
    const id = setTimeout(() => setPrev(null), TRANSITION_MS)
    return () => clearTimeout(id)
  }, [prev])

  return (
    <>
      <style>{KEYFRAMES}</style>
      {prev && (
        <div key={"prev-" + prev.key} className="ls-scene" style={{ position: "absolute", inset: 0, overflow: "hidden", animation: OUT_ANIM, pointerEvents: "none" }}>
          {prev.node}
        </div>
      )}
      <div key={"cur-" + itemKey} className="ls-scene" style={{ position: "absolute", inset: 0, overflow: "hidden", animation: IN_ANIM }}>
        {children}
      </div>
    </>
  )
}

/** Forhåndslast neste korts bilde så innfasingen aldri viser et halvlastet
 *  bilde. Video preloades ikke (Image() kan ikke laste video — stille no-op). */
export function usePreloadNext(next: LiveItem | null) {
  const url = next && !next.isVideo ? (next.pages[0] ?? next.imageUrl) : null
  useEffect(() => {
    if (!url) return
    const img = new Image()
    img.src = url
  }, [url])
}
```

- [ ] **Step 2: Verifiser at det kompilerer**

Run: `npx tsc --noEmit` — ingen feil for `scene-transition`.

- [ ] **Step 3: Commit**

```bash
git add src/app/widget/_shared/scene-transition.tsx
git commit -m "feat(skjerm): SceneTransition — ekte crossfade mellom kort + preload av neste bilde"
```

---

## Task 5: `SeasonLayer` — partikkel-lag for jul og 17. mai

**Files:**
- Create: `src/app/widget/_shared/season-layer.tsx`

- [ ] **Step 1: Skriv komponenten**

```tsx
// src/app/widget/_shared/season-layer.tsx
"use client"

import type { CSSProperties } from "react"
import type { SeasonKey } from "@/lib/season"

/**
 * Diskré sesongatmosfære over bakgrunnen, under kortene («Levende skjerm»).
 * Maks 16 partikler, kun transform-animasjon, deterministiske verdier fra
 * indeks (aldri Math.random — SSR-hydrering må matche klienten). Sommer har
 * ingen partikler (varmere tone håndteres av AmbientBackdrop via Season.tint).
 */

const COUNT = 16
const FLAG_COLORS = ["#ba0c2f", "#ffffff", "#00205b"]

const KEYFRAMES = "@keyframes lsFall{from{transform:translate3d(0,-6vh,0)}to{transform:translate3d(var(--ls-sway,0px),106vh,0)}}@media (prefers-reduced-motion: reduce){.ls-particle{display:none}}"

function particleStyle(i: number, season: "jul" | "syttendemai"): CSSProperties {
  // Primtalls-hopp gir jevn, deterministisk spredning uten tilfeldighet.
  const left = (i * 61) % 100
  const size = 6 + ((i * 7) % 9)
  const dur = 12 + ((i * 5) % 11)
  const delay = -((i * 3.7) % dur) // negativ delay → «himmelen er i gang» fra første frame
  const sway = ((i % 5) - 2) * 30
  return {
    position: "absolute",
    top: 0,
    left: left + "%",
    width: size,
    height: season === "jul" ? size : Math.round(size * 1.6),
    borderRadius: season === "jul" ? 9999 : 2,
    background: season === "jul" ? "rgba(255,255,255,.75)" : FLAG_COLORS[i % 3],
    opacity: 0.35 + ((i * 13) % 50) / 100,
    animation: "lsFall " + dur + "s linear " + delay + "s infinite",
    ["--ls-sway" as string]: sway + "px",
    pointerEvents: "none",
    willChange: "transform",
  }
}

export function SeasonLayer({ season }: { season: SeasonKey | null }) {
  if (season !== "jul" && season !== "syttendemai") return null
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{KEYFRAMES}</style>
      {Array.from({ length: COUNT }, (_, i) => (
        <div key={i} className="ls-particle" style={particleStyle(i, season)} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Verifiser kompilering og commit**

Run: `npx tsc --noEmit` — ingen feil for `season-layer`.

```bash
git add src/app/widget/_shared/season-layer.tsx
git commit -m "feat(skjerm): SeasonLayer — jul-snøfall og 17. mai-konfetti (maks 16 partikler)"
```

---

## Task 6: Feature-flagg `seasonThemes` + migrasjon + `seasonForStore`

**Files:**
- Modify: `src/lib/tenant/features.ts` (nytt flagg i `TENANT_FEATURES`)
- Create: `src/lib/tenant/store-features.ts`
- Create: `supabase/migrations/20260702130000_season_themes_flagg.sql`

- [ ] **Step 1: Legg flagget til i `TENANT_FEATURES`** (etter `kpi`-linjen i `features.ts`)

```ts
  /** Sesongatmosfære på skjermflatene (jul-snø, 17. mai-konfetti, sommertone) — «Levende skjerm». */
  seasonThemes: "Sesongtemaer på skjerm",
```

- [ ] **Step 2: Skriv `seasonForStore`-helperen**

```ts
// src/lib/tenant/store-features.ts
import { createAdminClient } from "@/lib/supabase/server"
import { activeSeason, type Season } from "@/lib/season"
import { hasFeature, parseTenantFeatures } from "./features"

/**
 * Sesong for en butikks skjerm: aktiv sesong HVIS butikkens tenant har
 * `seasonThemes` slått på. Widget-sidene er offentlige og leser via
 * service-role (etablert widget-mønster). Uten butikk (base-feed) → null.
 * Feiler alltid stille til null — en skjerm skal aldri knekke på pynt.
 */
export async function seasonForStore(storeId: string | null): Promise<Season | null> {
  if (!storeId) return null
  try {
    const admin = createAdminClient()
    const { data } = await admin.from("stores").select("tenants(features)").eq("id", storeId).maybeSingle()
    // `features` (030) er ikke i den genererte Database-typen ennå → cast (samme som config-server.ts).
    const row = data as unknown as { tenants: { features: unknown } | null } | null
    const features = parseTenantFeatures(row?.tenants?.features)
    return hasFeature(features, "seasonThemes") ? activeSeason() : null
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Skriv migrasjonen** (timestamp-prefiks — ALDRI `NNN_`, jf. AGENTS.md)

```sql
-- supabase/migrations/20260702130000_season_themes_flagg.sql
-- Sesongatmosfære («Levende skjerm») på skjermflatene: jul-snøfall, 17. mai-
-- konfetti og sommertone i bakgrunnsgløden. Gates per tenant via features-
-- flagget `seasonThemes` (se src/lib/tenant/features.ts). Slås på for
-- Gange-Rolv; andre tenants opt-er inn senere. Idempotent (jsonb-merge).
--
-- Merk: repo-migrasjoner er frakoblet prod (Branching driver ikke prod), så
-- denne kjøres også direkte mot prod-prosjektet (gange-rolv-infoskjerm).

update public.tenants
set features = coalesce(features, '{}'::jsonb) || '{"seasonThemes": true}'::jsonb
where id = '00000000-0000-0000-0000-000000000001'; -- Gange-Rolv AS (samme id som 040)
```

- [ ] **Step 4: Verifiser og commit**

Run: `npx tsc --noEmit` — ingen feil for `store-features`.

```bash
git add src/lib/tenant/features.ts src/lib/tenant/store-features.ts supabase/migrations/20260702130000_season_themes_flagg.sql
git commit -m "feat(tenant): seasonThemes-flagg + seasonForStore-helper (på for Gange-Rolv)"
```

> Migrasjonen kjøres mot prod som del av Task 11 (etter visuell verifisering), via etablert flyt (Supabase MCP `apply_migration` mot prosjekt `fcxwrfmdvfjulhoebceq` — verifiser prosjekt-ID mot `.env` først; lokkedue-prosjektet «Infoskjerm» finnes).

---

## Task 7: Nyheter — kjede-henting + full innplugging

**Files:**
- Modify: `src/app/widget/nyheter/page.tsx`
- Modify: `src/app/widget/nyheter/news-rotator.tsx`

### 7a — `page.tsx`: hent kjede + sesong

- [ ] **Step 1: Nye imports** (etter eksisterende imports)

```ts
import { createAdminClient } from "@/lib/supabase/server"
import { seasonForStore } from "@/lib/tenant/store-features"
import type { ChainBrand } from "@/app/widget/tilbud/offer-card"
```

- [ ] **Step 2: Utvid `Promise.all`** — erstatt

```ts
  const [items, tickerItems] = await Promise.all([
    fetchLiveContent(store ?? null, cardTypes, audience, avdeling),
    audience === "intern" ? fetchLiveContent(store ?? null, ["ticker"], "intern", avdeling) : Promise.resolve([]),
  ])
```

med

```ts
  const [items, tickerItems, storeRow, season] = await Promise.all([
    fetchLiveContent(store ?? null, cardTypes, audience, avdeling),
    audience === "intern" ? fetchLiveContent(store ?? null, ["ticker"], "intern", avdeling) : Promise.resolve([]),
    store
      ? createAdminClient().from("stores").select("chains(name, logo_url, color, brand_fg)").eq("id", store).maybeSingle()
      : Promise.resolve({ data: null }),
    seasonForStore(store ?? null),
  ])
  const chainRow = (storeRow.data as unknown as { chains: { name: string; logo_url: string | null; color: string; brand_fg: string | null } | null } | null)?.chains ?? null
  const chain: ChainBrand | null = chainRow
    ? { name: chainRow.name, logoUrl: chainRow.logo_url, color: chainRow.color, brandFg: chainRow.brand_fg }
    : null
```

- [ ] **Step 3: Send props videre** — erstatt return-linjen med

```tsx
  return <NewsRotator items={items as LiveItem[]} qr={qr} ticker={ticker} portrait={portrait} chain={chain} season={season} />
```

### 7b — `news-rotator.tsx`: aksent, backdrop, crossfade, puls

- [ ] **Step 4: Imports og opprydding**

Legg til:

```ts
import { AmbientBackdrop } from "@/app/widget/_shared/ambient-backdrop"
import { SceneTransition, usePreloadNext } from "@/app/widget/_shared/scene-transition"
import { SeasonLayer } from "@/app/widget/_shared/season-layer"
import { formatPeriod, expiryLabel } from "@/app/widget/_shared/period"
import { KEYFRAMES as TOKEN_KEYFRAMES, hexAlpha } from "@/app/widget/_shared/tokens"
import type { ChainBrand } from "@/app/widget/tilbud/offer-card"
import type { Season } from "@/lib/season"
```

Slett den lokale `formatPeriod`-funksjonen (linje 111–117) — den er flyttet til `period.ts` med identisk oppførsel.

- [ ] **Step 5: `frame` — backdrop overtar bakgrunnen.** Erstatt `background:`-linjen (radial-gradient + linear-gradient) i `frame` med:

```ts
  background: "#0a0a0c",
```

- [ ] **Step 6: Aksent-prop i chrome-komponentene.** Alle forekomster av hardkodet `#16a34a` i chrome får aksent via props med grønn default (null endring uten kjede). `StatsCard` sine pil-farger (`up`-grønn/`down`-rød) er semantiske — IKKE rør dem.

`Kicker` — erstatt hele funksjonen med:

```tsx
function Kicker({ children, accent = "#16a34a" }: { children: string; accent?: string }) {
  // Premium etikett: lysende aksent-bar + versaler. Konsistent på alle nyhets-kort.
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 16, margin: "0 0 20px" }}>
      <span style={{ width: 46, height: 5, borderRadius: 9999, background: accent, boxShadow: "0 0 18px " + hexAlpha(accent, 0.75) }} />
      <span style={{ color: accent, fontWeight: 800, letterSpacing: 4, fontSize: 26, textTransform: "uppercase" }}>{children}</span>
    </div>
  )
}
```

`RichBlocks` og `ScrollText` — legg til `accent`-prop og bruk den på bullet-fargen:

```tsx
function RichBlocks({ blocks, accent = "#16a34a" }: { blocks: Block[]; accent?: string }) {
```
(bullet-spanen: `style={{ color: accent }}`)

```tsx
function ScrollText({ blocks, style, accent }: { blocks: Block[]; style?: CSSProperties; accent?: string }) {
```
(render: `<RichBlocks blocks={blocks} accent={accent} />`)

`PeriodChip` — erstatt hele funksjonen med (puls ved «slutter snart»):

```tsx
function PeriodChip({ item, accent = "#16a34a", accentFg = "#fff" }: { item: LiveItem; accent?: string; accentFg?: string }) {
  // Only offers have a customer-relevant validity period. On regular posts the
  // date is just an internal publish/scheduling detail — don't show it.
  if (item.type !== "slide") return null
  const urgent = expiryLabel(item.validTo)
  const label = urgent ?? formatPeriod(item.validFrom, item.validTo)
  if (!label) return null
  const pulse = urgent ? { animation: "wPulse 1.6s ease-in-out infinite", boxShadow: "0 0 24px " + hexAlpha(accent, 0.6) } : {}
  return (
    <span style={{ display: "inline-block", alignSelf: "flex-start", background: accent, color: accentFg, fontSize: 26, fontWeight: 700, padding: "10px 24px", borderRadius: 9999, marginBottom: 20, ...pulse }}>
      {label}
    </span>
  )
}
```

`TickerOverlay` — signatur `{ messages, accent = "#16a34a", accentFg = "#fff" }`, de to `background: "#16a34a"` → `background: accent`, og `color: "#fff"` på ytterdiven → `color: accentFg`.

- [ ] **Step 7: Prop-drilling.** `StandardCard`, `SplitCard`, `PosterCard`, `JobCard`, `StatsCard` og `Card` får `accent`/`accentFg` som valgfrie props (default `"#16a34a"`/`"#fff"`) og sender dem videre til `Kicker`, `PeriodChip` og `ScrollText`/`RichBlocks` der de brukes. `Card`-switchen sender kun videre til kort som bruker chrome (Standard/Split/Poster/Job/Stats) — `CompetitionCard`/`InvitationCard`/`GalleryCard`/`SlideCard` røres IKKE (egne fargespråk).

- [ ] **Step 8: `NewsRotator` — nye props + komposisjon.** Erstatt signaturen med:

```tsx
export function NewsRotator({ items, qr, ticker, portrait = false, chain = null, season = null }: { items: LiveItem[]; qr: Record<string, string>; ticker: string[]; portrait?: boolean; chain?: ChainBrand | null; season?: Season | null }) {
```

Rett etter state/effects, legg til:

```tsx
  const accent = chain?.color || "#16a34a"
  const accentFg = chain?.brandFg || "#fff"
  const next = items.length > 1 ? items[(i + 1) % items.length] : null
  usePreloadNext(next)
```

Erstatt return-blokken med:

```tsx
  return (
    <main style={frame}>
      <style>{"@keyframes grKenBurns{from{transform:scale(1)}to{transform:scale(1.1)}}" + TOKEN_KEYFRAMES}</style>
      <AmbientBackdrop accent={accent} tint={season?.tint ?? null} intensity="subtle" />
      <SeasonLayer season={season?.key ?? null} />
      {!item ? (
        <div style={{ ...contentInset, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 34 }}>
          Ingen publiserte nyheter
        </div>
      ) : (
        <div style={contentInset}>
          <SceneTransition itemKey={item.id}>
            <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: item.bgColor ?? undefined, color: item.textColor ?? undefined }}>
              <Card item={item} qrUrl={qr[item.id]} portrait={portrait} accent={accent} accentFg={accentFg} />
            </div>
          </SceneTransition>
        </div>
      )}
      {hasTicker && <TickerOverlay messages={ticker} accent={accent} accentFg={accentFg} />}
    </main>
  )
```

(`grFade`-keyframen fjernes — den er erstattet av SceneTransition.)

- [ ] **Step 9: Verifiser**

Run: `npx tsc --noEmit && npx vitest run src/app/widget/_shared/period.test.ts`
Expected: begge grønne.

- [ ] **Step 10: Commit**

```bash
git add src/app/widget/nyheter/page.tsx src/app/widget/nyheter/news-rotator.tsx
git commit -m "feat(nyheter): levende skjerm — crossfade, kjedefarget backdrop/chrome, utløps-puls, sesonglag"
```

---

## Task 8: Tilbud — chrome-aksent + innplugging

**Files:**
- Modify: `src/app/widget/tilbud/page.tsx`
- Modify: `src/app/widget/tilbud/tilbud-rotator.tsx`

- [ ] **Step 1: `page.tsx` — sesong.** Import `seasonForStore`, legg `seasonForStore(store ?? null)` til sist i `Promise.all`-arrayen (destrukturer som `season`), og send `season={season}` til `<TilbudRotator …>`.

- [ ] **Step 2: `tilbud-rotator.tsx` — imports + opprydding.** Samme imports som Task 7 Step 4 (AmbientBackdrop, SceneTransition/usePreloadNext, SeasonLayer, formatPeriod/expiryLabel, TOKEN_KEYFRAMES/hexAlpha, Season — `ChainBrand` er allerede importert). Slett lokal `formatPeriod` (linje 32–38).

- [ ] **Step 3: `frame`-bakgrunn** → `background: "#0a0a0c"`.

- [ ] **Step 4: Aksent i chrome.**
  - `RichBlocks`: `accent`-prop som i Task 7 (bullet-span `color: accent`; default `GREEN`).
  - `PosterHeader`: signatur `{ item, storeName, accent = GREEN, accentFg = "#fff" }`; kicker-`<p>` `color: accent`; periode-span `background: accent, color: accentFg` + puls:

```tsx
  const urgent = expiryLabel(item.validTo)
  const period = urgent ?? formatPeriod(item.validFrom, item.validTo)
  const pulse = urgent ? { animation: "wPulse 1.6s ease-in-out infinite", boxShadow: "0 0 24px " + hexAlpha(accent, 0.6) } : {}
```
(spre `...pulse` inn i period-spanens style.)
  - `TickerOverlay`: `accent`/`accentFg`-props som i Task 7 (to `background: GREEN` → `accent`).

- [ ] **Step 5: `TilbudRotator` — komposisjon.** Signaturen får `season = null` (`season?: Season | null`). Etter `const item = …`:

```tsx
  const accent = chain?.color || GREEN
  const accentFg = chain?.brandFg || "#fff"
  const next = items.length > 1 ? items[(i + 1) % items.length] : null
  usePreloadNext(next)
```

Restrukturer rendering: dagens fem betingede grener produserer hver et kort — trekk dem ut i en `card`-variabel og send gjennom ÉN SceneTransition:

```tsx
  const card = !item ? null
    : item.klubb ? <KundeklubbCard headline={item.klubb.headline} subtext={item.klubb.subtext} cta={item.klubb.cta || undefined} qrUrl={qr[item.id] ?? ""} accent={chain?.color || "#16a34a"} logoUrl={chain?.logoUrl ?? null} chainName={chain?.name ?? null} />
    : item.type === "competition" ? <CompetitionCard item={item} qrUrl={qr[item.id]} portrait />
    : item.type === "gallery" ? <GalleryCard item={item} qrUrl={qr[item.id]} portrait />
    : item.offer ? <OfferCard item={item} chain={chain} />
    : (item.isPdf || item.isPpt) && item.imageUrl ? <PdfFlyer url={item.imageUrl} title={item.title} color={chain?.color} fg={chain?.brandFg} pages={item.pages} ppt={item.isPpt} />
    : (
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: item.bgColor ?? undefined, color: item.textColor ?? undefined }}>
        <PosterHeader item={item} storeName={storeName} accent={accent} accentFg={accentFg} />
        <div style={{ flex: "1 1 auto", minHeight: 0, display: "flex", padding: "0 54px 54px", boxSizing: "border-box" }}>
          <Media item={item} />
        </div>
        {qr[item.id] && (
          <div style={{ position: "absolute", right: 48, bottom: 48, background: "#fff", borderRadius: 26, padding: "24px 24px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: "0 22px 60px rgba(0,0,0,.4)", animation: "grTbPop .6s cubic-bezier(.16,1,.3,1)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr[item.id]} alt="QR" style={{ width: 210, height: 210, display: "block", borderRadius: 8 }} />
            <span style={{ color: "#0a0a0a", fontWeight: 900, fontSize: 23, letterSpacing: 1, textTransform: "uppercase" }}>Skann for mer</span>
          </div>
        )}
      </div>
    )

  return (
    <main style={frame}>
      <style>{"@keyframes grTbKen{from{transform:scale(1)}to{transform:scale(1.07)}}@keyframes grTbPop{from{opacity:0;transform:scale(.85) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}" + TOKEN_KEYFRAMES}</style>
      <AmbientBackdrop accent={accent} tint={season?.tint ?? null} intensity="normal" />
      <SeasonLayer season={season?.key ?? null} />
      {!item ? (
        <div style={{ ...inset, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 34 }}>
          Ingen aktive tilbud
        </div>
      ) : (
        <div style={inset}>
          <SceneTransition itemKey={item.id}>{card}</SceneTransition>
        </div>
      )}
      {hasTicker && <TickerOverlay messages={ticker} accent={accent} accentFg={accentFg} />}
    </main>
  )
```

(Kort-grener som selv er fullskjerms-komponenter (KundeklubbCard osv.) rendrer sin egen `position:absolute`-fylling — de fungerer uendret inne i SceneTransition-laget. `grFade` fjernes.)

- [ ] **Step 6: Verifiser + commit**

Run: `npx tsc --noEmit` — grønt.

```bash
git add src/app/widget/tilbud/page.tsx src/app/widget/tilbud/tilbud-rotator.tsx
git commit -m "feat(tilbud): levende skjerm — crossfade, kjedefarget chrome/backdrop, utløps-puls"
```

---

## Task 9: Kampanje — innplugging + utløps-puls

**Files:**
- Modify: `src/app/widget/kampanje/page.tsx`
- Modify: `src/app/widget/kampanje/kampanje-rotator.tsx`

- [ ] **Step 1: `page.tsx`** — import `seasonForStore`, legg `seasonForStore(store ?? null)` sist i `Promise.all` (destrukturer `season`), send `season={season}` til `<KampanjeRotator …>`.

- [ ] **Step 2: `kampanje-rotator.tsx`** — imports (AmbientBackdrop, SceneTransition/usePreloadNext, SeasonLayer, expiryLabel/formatPeriod, TOKEN_KEYFRAMES/hexAlpha, Season). Slett lokal `formatPeriod` (linje 29–35).

- [ ] **Step 3: `LandscapePoster` — utløps-puls.** Erstatt `const period = formatPeriod(item.validFrom, item.validTo)` med:

```tsx
  const urgent = expiryLabel(item.validTo)
  const period = urgent ?? formatPeriod(item.validFrom, item.validTo)
  const pulse = urgent ? { animation: "wPulse 1.6s ease-in-out infinite", boxShadow: "0 0 24px " + hexAlpha(brand, 0.6) } : {}
```

og spre `...pulse` inn i period-spanens style. (`LandscapePoster` beholder ellers sin egen bakgrunn — bevisst, «ikke brekk det som fungerer».)

- [ ] **Step 4: `KampanjeRotator` — komposisjon.** Signaturen får `season = null` (`season?: Season | null`). `frame`-bakgrunnen er allerede mørk — behold. Etter `const item = …`:

```tsx
  const accent = chain?.color || "#16a34a"
  const next = items.length > 1 ? items[(i + 1) % items.length] : null
  usePreloadNext(next)
```

Return-blokk:

```tsx
  return (
    <main style={frame}>
      <style>{"@keyframes grKb{from{transform:scale(1)}to{transform:scale(1.08)}}" + TOKEN_KEYFRAMES}</style>
      <AmbientBackdrop accent={accent} tint={season?.tint ?? null} intensity="normal" />
      <SeasonLayer season={season?.key ?? null} />
      {!item ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 34 }}>
          Ingen aktive kampanjer
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0 }}>
          <SceneTransition itemKey={item.id}>
            {item.campaign ? (
              <CampaignCard item={item} chain={chain} />
            ) : item.type === "competition" ? (
              <CompetitionCard item={item} qrUrl={qr[item.id]} />
            ) : item.type === "gallery" ? (
              <GalleryCard item={item} qrUrl={qr[item.id]} />
            ) : item.offer ? (
              <OfferCard item={item} chain={chain} orientation="landscape" />
            ) : (
              <LandscapePoster item={item} chain={chain} qrUrl={qr[item.id]} />
            )}
          </SceneTransition>
        </div>
      )}
    </main>
  )
```

- [ ] **Step 5: Verifiser + commit**

Run: `npx tsc --noEmit` — grønt.

```bash
git add src/app/widget/kampanje/page.tsx src/app/widget/kampanje/kampanje-rotator.tsx
git commit -m "feat(kampanje): levende skjerm — crossfade, backdrop, sesonglag, utløps-puls"
```

---

## Task 10: Preview — `?season=`-override

**Files:**
- Modify: `src/app/widget/preview/page.tsx`

- [ ] **Step 1:** Import: `import { parseSeasonKey } from "@/lib/season"`. Utvid searchParams-typen til `{ d?: string; o?: string; season?: string }` og destrukturer `season`. Etter destruktureringen:

```ts
  const seasonOverride = parseSeasonKey(season)
```

- [ ] **Step 2:** Send `season={seasonOverride}` til begge rotator-returene (`TilbudRotator` og `NewsRotator`). CampaignCard-grenen røres ikke.

- [ ] **Step 3: Verifiser + commit**

Run: `npx tsc --noEmit` — grønt.

```bash
git add src/app/widget/preview/page.tsx
git commit -m "feat(preview): season-override for å teste sesonglag i editor-preview"
```

---

## Task 11: Visuell verifisering (Playwright) + migrasjon mot prod

**Files:** ingen nye committede filer — screenshots og hjelpescript til scratchpad-katalogen.

- [ ] **Step 1: Start EGEN dev-server** (aldri gjenbruk :3000 — kjent stale-server-felle):

Run (bakgrunn): `npm run dev -- --port 3123`

Vent på ready, verifiser deretter MARKØR (bevis på at DENNE koden serveres): hent `http://localhost:3123/widget/preview` med curl og sjekk at responsen inneholder `lsDriftA` (ny keyframe). Finnes den ikke → feil server/port, stopp og finn riktig prosess.

- [ ] **Step 2: Generer preview-payloads.** Skriv et lite script `payload.mjs` i scratchpad som base64url-koder et JSON-objekt (samme format som `PreviewData` i `src/app/widget/preview/page.tsx`) og printer strengen. Kjør det for hvert scenario under, og bygg URL-en `http://localhost:3123/widget/preview?d=<payload>`:

Scenario-payloads (JSON-innhold):
1. **Rød kjede + utløper i dag**: `type: "news"`, `audience: "kunde"`, `title: "Grillhelg på torget"`, `bodyHtml: "<p>Kortreist mat og gode priser hele helgen.</p>"`, `validTo: <dagens dato som YYYY-MM-DD>`, `chain: { name: "Testkjede", logoUrl: null, color: "#b91c1c", brandFg: "#ffffff" }`
2. **Uten kjede**: samme uten `chain` og uten `validTo`
3. **Intern stående**: `audience: "intern"`, `type: "news"` + URL-suffiks `&o=portrait`
4. **Sesong jul**: scenario 2 + URL-suffiks `&season=jul`
5. **Sesong 17. mai**: scenario 2 + URL-suffiks `&season=syttendemai`

- [ ] **Step 3: Ta screenshots og VURDER dem** (Read-verktøyet på hver PNG):

For hvert scenario: `npx playwright screenshot --viewport-size=1080,1920 --wait-for-timeout=1500 "<url>" <scratchpad>/<navn>.png`

Sjekkliste:
- Scenario 1: kicker/periodechip/backdrop-glød er RØDE (ikke grønne); «Slutter i dag»-chip vises.
- Scenario 2: alt er grønt som i dag (regresjonssjekk).
- Scenario 3: subtil backdrop, kortet leselig.
- Scenario 4: snøpartikler synlige. Scenario 5: konfetti i flaggfarger.
- Liggende variant av scenario 2 med `--viewport-size=1920,1080` og `&o=landscape`: intet overflow.

- [ ] **Step 4: Crossfade-bevis mot ekte rotasjon.** Base-feeden `/widget/nyheter?o=portrait` (uten store) roterer ekte innhold (16 s per kort). Ta ett screenshot med `--wait-for-timeout=3000` (stabilt) og ett med `--wait-for-timeout=16300` (midt i overgangen). Expected: overgangs-bildet viser gammelt kort på vei ut / nytt på vei inn. NB: items med egen `durationSeconds` forskyver timingen — juster ventetid etter første korts faktiske varighet; best effort, ikke flaky-kritisk.

- [ ] **Step 5: Kjør migrasjonen mot prod** (etter at det visuelle er godkjent): Supabase MCP `apply_migration` mot prosjekt `fcxwrfmdvfjulhoebceq` — VERIFISER først at prosjekt-ID matcher `NEXT_PUBLIC_SUPABASE_URL` i `.env.local` (lokkedue-prosjektet «Infoskjerm» finnes!). Innhold = SQL-en fra Task 6.

- [ ] **Step 6: Stopp dev-serveren.**

---

## Task 12: Sluttsjekk, SPRINTS-notat og PR

**Files:**
- Modify: `SPRINTS.md` (kort seksjon)

- [ ] **Step 1: Full verifisering**

```bash
npm run lint && npx tsc --noEmit && npx vitest run && npm run build
```
Expected: alt grønt. (E2E-suiten i `e2e/` krever innlogget miljø — kjøres ikke her; visuell dekning er Task 11.)

- [ ] **Step 2: SPRINTS.md** — legg til under «Multi-tenant …»-seksjonen (over «Sprint 1»):

```markdown
## Levende skjerm — motion & atmosfære (2026-07-02) ✅
Crossfade mellom kort (SceneTransition + preload), kjedefarget levende bakgrunn
(AmbientBackdrop), kjedefarge-chrome i nyheter/tilbud (erstattet hardkodet grønn — fikser
grønn ticker på Mobile-skjermer), «Slutter i dag/i morgen»-puls (<48 t), sesongtema bak
`seasonThemes`-flagget (på for Gange-Rolv). Kun transform/opacity (Pi-gulv).
Spec: docs/superpowers/specs/2026-07-02-levende-skjerm-design.md
```

- [ ] **Step 3: Commit + push + PR.** Origin = fork (frlund3), PR går til upstream `Framtidmedia-no/infoskjerm` med base `dev`. Skriv PR-beskrivelsen til en fil (scratchpad `pr-body.md`) med innhold: Hva (de fem leveransene + lenke til spec), Trygghet (transform/opacity, Pi-gulv, fallback grønn, ingen skjemaendring), Test-sjekkliste (lint/tsc/vitest/build grønt, screenshots-funn fra Task 11).

```bash
git add SPRINTS.md
git commit -m "docs(sprints): levende skjerm — motion- og atmosfære-system"
git push -u origin feat/levende-skjerm
gh pr create --repo Framtidmedia-no/infoskjerm --base dev --head frlund3:feat/levende-skjerm --title "feat(skjerm): Levende skjerm — crossfade, kjedefarget atmosfære, utløps-puls og sesongtema" --body-file <scratchpad>/pr-body.md
```

---

## Ikke i scope (bevisst)

- Kort-interne bakgrunner (OfferCard/CampaignCard/CompetitionCard/LandscapePoster) beholder sitt eget fargespråk — backdrop synes bare der kort er transparente og i crossfade-øyeblikk.
- Påske/halloween-vinduer (datastrukturen i `season.ts` er klar for dem).
- Admin-UI for å skru sesongtema av/på per tenant (flagget settes via SQL/migrasjon som de andre flaggene).
- `/widget/vaer`, `topbar`, KPI-widgets — egne, enklere flater; tas ved behov senere.
