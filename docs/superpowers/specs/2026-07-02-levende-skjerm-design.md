# Levende skjerm — motion- og atmosfære-system (design)

**Dato:** 2026-07-02
**Status:** Utkast — venter på Franks review
**Gjelder:** Alle skjermflater — `/widget/nyheter`, `/widget/tilbud`, `/widget/kampanje` (+ preview/kiosk som gjenbruker rotatorene)

## Problem

Skjermene er innholdsmessig sterke, men *føles* statiske:

1. **Kortbytte er et enkelt fade** (`grFade .6s` på en keyed div) — forrige kort forsvinner
   momentant, nytt fader inn. Ingen ekte crossfade, ingen retning, ingen scenefølelse.
2. **Bakgrunnen er død** — flat mørk gradient (`tilbud-rotator.tsx:27`, `kampanje-rotator.tsx:24`)
   eller én statisk glød (`news-rotator.tsx:31`). Mellom kortbytter skjer ingenting.
3. **Aksentfargen er hardkodet grønn** (`#16a34a`) i rotator-chromen: Kicker-bar, PeriodChip,
   ticker og bullets i både nyheter og tilbud — selv om `/widget/tilbud` allerede henter
   kjedens farge/logo (`tilbud/page.tsx:62`) og kampanje-rotatoren bruker den. En Mobile-skjerm
   får i dag Gange-Rolv-grønn ticker. `/widget/nyheter` henter ikke kjede i det hele tatt.
4. **Tilbud gir ingen hastefølelse** — «Gjelder til 4. juli» ser lik ut enten det er 3 uker
   eller 3 timer igjen.
5. **Ingen sesongfølelse** — skjermen ser lik ut i desember og juli.

## Antakelser (tatt autonomt)

1. Motion-systemet (del 1–4) gjelder **alle tenants uten flagg** — det er merkevarebygging for
   produktet selv. Kun sesongtema (del 5) er opt-in per tenant.
2. Raspberry Pi (Chromium-kiosk) er ytelsesgulvet: kun `transform`/`opacity` animeres, aldri
   `filter`, layout-egenskaper eller store repaint-flater.
3. Ingen nye dependencies (ikke framer-motion e.l.) — ren CSS/React, samme mønster som
   eksisterende `fx-*`/`KEYFRAMES`.
4. Fallback-aksent uten kjede forblir dagens grønn `#16a34a` — ingen visuell endring for
   flater som ikke har kjede i dag.

## Vurderte tilnærminger

**A (valgt): Delte motion-komponenter i `widget/_shared/`, plugg
inn i de tre rotatorene.** Én kilde til bevegelsesspråket (som `tokens.ts` er for
rytme/typo). Crossfade krever at forrige kort holdes montert kort tid — det kan bare en
komponent som eier begge kortene gjøre.

**B (avvist): Globale CSS-klasser per kort.** Kan ikke gi ekte crossfade (dagens keyed
div-mønster monterer bare ett kort), og bevegelsesspråket spres over mange filer.

**C (avvist): Animasjonsbibliotek (framer-motion).** Ny dependency, større bundle, ukjent
Pi-kost — for fire keyframes og en crossfade er det ikke verdt det.

## Design — fem leveranser

### 1. `SceneTransition` — ekte crossfade mellom kort

Ny komponent `src/app/widget/_shared/scene-transition.tsx`:

- Eier «forrige + nåværende» kort. Ved bytte holdes forrige kort montert i overgangstiden
  (0,8 s) og fader ut med lett nedskalering (`opacity 1→0`, `scale 1→0.985`), mens nytt kort
  fader inn med dagens løft (`opacity 0→1`, `translateY 14px→0`). Maks 2 kort montert samtidig,
  gamle fjernes fra DOM etter overgang.
- **Preload av neste medium:** når et kort vises, forhåndslastes neste elements
  `imageUrl`/`pages[0]` med `new Image()` — innfasing viser aldri et halvlastet bilde.
- API: `<SceneTransition itemKey={item.id}>{kort}</SceneTransition>` — erstatter dagens
  `<div key={item.id} style={{animation: "grFade …"}}>` i alle tre rotatorer. Rotasjonslogikken
  (timere, reload) er uendret.

### 2. `AmbientBackdrop` — levende kjedefarget bakgrunn

Ny komponent `src/app/widget/_shared/ambient-backdrop.tsx`:

- Bakerste lag i rotator-framen: mørk basisgradient + 2–3 store radial-gradient-«blobs» i
  kjedefargen (lav alpha, ferdig myke — **ingen** `filter: blur`), som drifter sakte med
  `transform` (18/30 s, `alternate`, samme mønster som `.fx-drift`). Over: korn-tekstur for
  dybde — men med ren lav `opacity`, **ikke** `mix-blend-mode: overlay` som `.fx-grain` bruker
  (blend-modus over animerte lag tvinger kontinuerlig re-kompositt og er for dyrt på Pi).
- Props: `accent` (kjedefarge, fallback `#16a34a`), `intensity` (`subtle` for nyheter/intern,
  `normal` for kunde). Erstatter de statiske `background`-verdiene i alle tre frames.
- Skjermen ser levende ut også *mellom* kortbytter — det er dette som gjør at forbipasserende
  oppfatter skjermen som «på», ikke som en plakat.

### 3. Kjedefarge-chrome — aksent fra DB, ikke hardkodet

- `ChainBrand` (finnes i `offer-card.tsx:16`) sendes inn til `NewsRotator` og brukes i
  `TilbudRotator`-chromen: Kicker-bar/glow, PeriodChip, bullets i `RichBlocks`,
  `TickerOverlay`-bakgrunn og `PosterHeader`. Tekst på aksentflater bruker `brand_fg`.
- `/widget/nyheter/page.tsx` utvides til å hente `chains(name, logo_url, color, brand_fg)`
  via butikken — nøyaktig samme select som `tilbud/page.tsx:62`. Uten `?store` (base-feed)
  eller uten kjede: fallback `#16a34a` (null endring mot i dag).
- Dette fikser samtidig at Mobile-skjermer i dag får grønn Gange-Rolv-chrome.

### 4. Utløps-puls — «Slutter snart» på tilbud

- Når `validTo` er innen **48 timer** ved kort-montering, endres periode-teksten etter
  kalenderdøgn-differanse: 0 → «Slutter i dag», 1 → «Slutter i morgen», ellers «Slutter
  snart». Chipen får `wPulse`-animasjon (finnes i
  `tokens.ts` KEYFRAMES) + aksentfarge med glød. Beregnes én gang per visning — ingen
  sekund-ticking (kortet står bare ~18 s).
- Gjelder de tre stedene perioden vises: `PeriodChip` (nyheter), `PosterHeader` (tilbud)
  og period-pillen i `LandscapePoster` (kampanje). Logikken (terskel + tekst) legges i
  `tokens.ts` eller en liten `_shared/period.ts` så alle tre bruker samme.

### 5. `SeasonLayer` — sesongatmosfære (feature-flagget)

- Ny `src/lib/season.ts`: `activeSeason(now: Date): Season | null` med datovinduer
  (data-drevet liste; jul-vinduet krysser årsskiftet og må håndtere det):
  - **Jul/vinter** (1. des – 1. jan): sakte snøfall — maks 16 partikler, transform-only
    (samme teknikk som `.fx-confetti-piece`, men langsom og uendelig), + kjøligere
    backdrop-tone.
  - **17. mai** (15.–17. mai): diskré rød/hvit/blå konfetti-drypp ved kortbytte.
  - **Sommer** (1. jun – 31. aug): varmere gult/oransje-skjær i backdrop-blobbene (ingen
    partikler).
  - Strukturen er data-drevet (liste av `{fra, til, effekt}`) så påske/halloween kan legges
    til senere uten ny arkitektur.
- Ny komponent `src/app/widget/_shared/season-layer.tsx` rendres over backdrop, under kort.
- **Gated bak nytt feature-flagg `seasonThemes`** i `TENANT_FEATURES` (`features.ts`-mønsteret,
  punktene 1–3 i fil-docen): nøkkel + doc, `hasFeature(...)`-gate i widget-pages, og
  timestamp-migrasjon som slår på for **Gange-Rolv** (andre tenants opt-er inn senere via
  `tenants.features`). Av som default.
- Preview-siden kan overstyre med `?season=jul` for testing (kun preview, ikke ekte widgets).

## Dataflyt

Widget-page (server) henter som i dag innhold + kjede (nyheter: nå også kjede) + tenant-features
→ rotator (client) får `chain` og `season` som props → rotatoren komponerer:
`AmbientBackdrop` (bakerst) → `SeasonLayer` (hvis aktiv) → `SceneTransition` med kortet →
ticker-overlay (øverst, som i dag). Ingen endring i `live.ts`, innholdstyper eller DB-skjema —
alt i del 1–4 er ren presentasjon. Del 5 = flagg-data i `tenants.features`.

## Ytelses-guardrails (Raspberry Pi)

- Kun `transform` og `opacity` animeres. Aldri animert `filter`/`box-shadow`-interpolering på
  store flater; glød gjøres med statiske skygger eller pre-rendrede gradienter.
- Maks 2 kort i DOM under overgang; partikkel-tak 16; `will-change: transform` kun på lag som
  faktisk animerer.
- `prefers-reduced-motion` respekteres (mønsteret finnes i `globals.css:198`).
- Verifikasjon: Playwright på dev + **ekte Pi-sjekk** via skjermbilde-APIet fra Sprint 1 etter
  deploy (se at rotasjonen går jevnt, CPU ikke pinnes — `ssh`-tilgang til Pi-flåten finnes).

## Feilhåndtering

- Manglende kjede/farge → fallback-grønn overalt (aldri undefined-styling).
- Ugyldig `validTo` → ingen puls, vanlig chip (som i dag).
- `season.ts` returnerer `null` utenfor vinduene og når flagget er av → null overhead.
- Preload-feil på neste bilde ignoreres stille (kortet håndterer ødelagt bilde som i dag).

## Testing

- Playwright-screenshots i 1080×1920 og 1920×1080 av nyheter/tilbud/kampanje/preview:
  med og uten kjede (grønn fallback), utløps-puls (element med `validTo` < 48 t),
  `?season=jul` i preview. Egen dev-port + markørverifisering (kjent stale-server-felle).
- Overgangstest: to elementer, screenshot midt i overgangen — begge kort synlige (crossfade
  beviselig, ikke hardt bytte).
- Manuell Pi-verifisering etter deploy via skjermbilde-API + fysisk blikk på testskjermen.

## Known non-CMS (systemkonstanter)

Overgangstid (0,8 s), driftshastigheter (18/30 s), partikkel-tak (16), utløpsterskel (48 t) og
sesong-datovinduer er systemkonstanter — ikke kunde-redigerbart innhold. Kjedefarge/logo er
allerede CMS-styrt (`chains`), sesongtema av/på er DB-styrt per tenant (`tenants.features`).

## Berørte filer

- `src/app/widget/_shared/scene-transition.tsx` — NY
- `src/app/widget/_shared/ambient-backdrop.tsx` — NY
- `src/app/widget/_shared/season-layer.tsx` — NY
- `src/app/widget/_shared/period.ts` — NY (delt «slutter snart»-logikk)
- `src/lib/season.ts` — NY (dato-vinduer, ren funksjon, testbar)
- `src/lib/tenant/features.ts` — nytt flagg `seasonThemes`
- `src/app/widget/nyheter/{page.tsx,news-rotator.tsx}` — kjede-henting, chrome-aksent, innplugging
- `src/app/widget/tilbud/{page.tsx,tilbud-rotator.tsx}` — chrome-aksent, innplugging
- `src/app/widget/kampanje/{page.tsx,kampanje-rotator.tsx}` — innplugging, utløps-puls
- `src/app/widget/preview/page.tsx` — `?season=`-override + nye lag
- `supabase/migrations/<timestamp>_season_themes_flagg.sql` — slå på for aktuelle tenants
