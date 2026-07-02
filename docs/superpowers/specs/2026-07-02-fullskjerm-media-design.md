# Fullskjerm-media (bilde/PDF/PowerPoint) — design

**Dato:** 2026-07-02
**Status:** Utkast — venter på Franks review
**Gjelder:** Nyheter intern + kundeskjermer (alle flater)

## Problem

Redaktører vil kunne legge et bilde, en PDF eller en PowerPoint på **hele skjermen** — uten overskrift, kicker, periodechip eller annen ramme. Dagens nærmeste modus er `slide` med `imageMode: "plakat"`, men den viser fortsatt tittel + kicker + periode (`PosterCard`, `news-rotator.tsx:246`). Utfordringen: samme innhold skal se bra ut på både stående (1080×1920) og liggende (1920×1080) skjermer.

## Antakelser (tatt autonomt)

1. «På nyheter på intern og samme på kundeskjerm» = samme funksjon skal kunne vises på begge flater — helst med ett innholdselement som treffer begge (nytt audience-valg «begge»), ikke to dupliserte elementer.
2. Video bør støttes i samme modus (bucket og widgets støtter det allerede) — gratis å ta med.
3. Ingen tenant-feature-flagg — dette er en generell funksjon for alle tenants (kan gates senere via `tenants.features` om ønskelig).
4. Tittel-feltet beholdes som **internt navn** (kreves av `content_items.title` og admin-lista), men vises aldri på skjermen.

## Vurderte tilnærminger

**A (valgt): Utvid `slide` med `imageMode: "fullskjerm"`.** Gjenbruker hele eksisterende maskineri: opplasting, audience/avdeling-filtrering, sort_order, durationSeconds, PDF/PPT-renderpipeline, alle tre rotatorer. Ingen DB-migrasjon (alt bor i `body` JSONB).

**B (avvist): Ny innholdstype `fullscreen`.** Renere semantikk, men krever enum-migrasjon, ny admin-flyt og endringer i alle widget-switcher + `live.ts` — mye plumbing, null reell gevinst.

**C (avvist): Klient-rendering (pdf.js-iframe / Office-embed) i widgeten.** Upålitelig og tungt på Raspberry Pi, PPT krever Microsofts embed-tjeneste (nett-avhengig), og vi HAR en bevist prerender-pipeline (`render-decks`) som gjør PDF/PPT om til crisp JPEG-sider i GitHub Actions.

### Delbeslutning: stående vs liggende

1. Én fil + blur-fill alltid — enklest, men innhold laget for 16:9 blir lite på 9:16.
2. **(valgt) To valgfrie opplastingsslots (liggende + stående), minst én påkrevd, blur-fill-fallback** — perfekt resultat der redaktøren gidder å lage to varianter, pent resultat der de bare laster opp én.
3. Smart-crop (`cover`) — avvist: kutter priser/tekst i plakater.

Blur-fill = eksisterende to-lags mønster fra `news-rotator.tsx:183` — uskarp `cover`-kopi bak + `contain`-lag foran, kant-til-kant uten svarte striper.

## Datamodell (kun `body` på `slide`-elementer — ingen migrasjon)

```
imageMode: "fullskjerm"          // ny verdi i ImageMode-union
imageUrl / imageUrls[0]          // primær/liggende variant (som i dag)
pages, pagesFor                  // prerendrede sider for primærfil (som i dag)
portraitUrl: string | null       // NY: valgfri stående variant
portraitPages: string[]          // NY: prerendrede sider for stående fil
portraitPagesFor: string         // NY: kildesporing (re-render ved filbytte)
audience: "kunde" | "intern" | "begge"   // NY verdi «begge»
durationSeconds                  // som i dag; for PDF/PPT = sekunder PER SIDE (default 8)
```

Minst én av `imageUrl`/`portraitUrl` må være satt (valideres i `saveContent`).

## Admin-UX (`content-form.tsx`)

I dag tvinges slide til `"plakat"` (linje 385/417). Endring: slide får to visningsvalg — **«Plakat (med tittel)»** og **«Fullskjerm (kun media)»**.

Når Fullskjerm er valgt:

- Tekst-, farge-, tilbuds- og kampanjefelter skjules. Tittel merkes «Internt navn — vises ikke på skjermen».
- **To opplastingsslots** med anbefalte mål synlig i UI:
  - **Liggende skjermer — anbefalt 1920×1080 px (16:9)**. Høyere oppløsning i samme forhold er fint (f.eks. 3840×2160).
  - **Stående skjermer — anbefalt 1080×1920 px (9:16)**.
  - Begge aksepterer JPG/PNG/WebP/AVIF/GIF, MP4/WebM, PDF, PPT/PPTX — maks 50 MB (bucket-MIME allerede på plass, migrasjon 039).
  - Hint under slotsene: «Fyller du bare én, vises den på begge orienteringer — med uskarp utfylling der formatet ikke passer.»
- **Dokument-veiledning** (vises når PDF/PPT lastes opp): «PowerPoint: bruk 16:9-lysbilder for liggende skjermer; egendefinert lysbildestørrelse 19,05 × 33,87 cm for stående. PDF: eksporter i samme forhold som skjermen (A4 stående fungerer, 9:16 er optimalt). Maks 6 sider vises.»
- **Aspekt-sjekk (mild advarsel):** ved bildeopplasting leses `naturalWidth/Height` klientside; avviker forholdet >10 % fra slotens mål vises gult hint: «Formatet avviker fra 16:9 — vises med uskarp utfylling.» Blokkerer ikke.
- **Audience-velger:** Kunde / Intern / Begge flater.
- PDF/PPT viser eksisterende render-status (pages mangler → «Klargjøres for skjerm …», ekte status fra `body.pages`, ikke fake progress).

## Widget-rendering

Ny delt komponent **`FullscreenMedia`** i `src/app/widget/_shared/`:

- `position: absolute; inset: 0; background: #000` — ingen padding, tittel, kicker, chip eller scrim.
- **Variantvalg:** portrett-skjerm → `portraitUrl`/`portraitPages` hvis satt, ellers primær; liggende → primær hvis satt, ellers portrett-variant. (Orientering er allerede kjent: `?o=portrait` / `screens.orientation` / ScaledScreen.)
- **Bilde:** blur-fill to-lags (cover-blur bak, contain foran). Ved korrekt aspekt fyller contain 100 % og blur-laget er usynlig.
- **Video:** `autoPlay muted loop playsInline`, contain + blur-lag bak (poster-frame).
- **PDF/PPT:** roterer prerendrede `pages` (gjenbruk `PdfFlyer`-logikken fra `tilbud/pdf-flyer.tsx`) med blur-fill per side; `durationSeconds` = per side, totaltid = sider × per-side. Aldri iframe-PDF i fullskjerm (upålitelig på Pi).

Innplugging (én betinget gren per rotator): `nyheter/news-rotator.tsx` (intern + kunde), `tilbud`-rotator (stående kunde), `kampanje`-rotator (liggende kunde): `item.imageMode === "fullskjerm"` → `<FullscreenMedia />` i stedet for kortkomponent. Eksisterende overganger/rotasjon beholdes.

`live.ts`: `audienceOf`-filteret utvides til å slippe gjennom `audience === "begge"` på begge flater.

## Pipeline (`render-decks`)

`check-pending-decks.mjs` + `render-decks.mjs` utvides til også å sjekke `portraitUrl` når den er PDF/PPT → rendrer til `portraitPages`/`portraitPagesFor`, lagres som `decks/{id}-portrait-p{n}.jpg`. Ellers uendret (MAX_PAGES=6, SCALE=3.0, dispatch ved publisering + 15-min poll). Merk: i dag rendrer pipelinen kun PPT — PDF vises via iframe i PosterCard. For fullskjerm skal **også PDF** gjennom pipelinen (samme kode-sti, LibreOffice-steget hoppes over for PDF).

## Anbefalte mål (fasit som vises i UI)

| Innhold | Liggende skjerm | Stående skjerm |
|---|---|---|
| Bilde | 1920×1080 px (16:9) — eller 3840×2160 | 1080×1920 px (9:16) |
| Video | MP4/H.264, 1920×1080 | MP4/H.264, 1080×1920 |
| PowerPoint | 16:9-lysbilder (standard) | Egendefinert 19,05 × 33,87 cm |
| PDF | Eksport i 16:9 liggende | 9:16 (A4 stående OK med blur-fill) |

Maks 50 MB per fil, maks 6 sider per dokument.

## Feilhåndtering

- `saveContent` avviser fullskjerm-element uten media («Last opp minst én fil»).
- Deck uten ferdige `pages` viser en diskret vente-tilstand («Gjøres klar for skjerm …») — samme oppførsel som dagens PPT-håndtering i PdfFlyer.
- Ødelagt bilde-URL: rotatoren går videre til neste element (eksisterende oppførsel).

## Testing

- Playwright-screenshots av `/widget/preview` + nyheter/tilbud/kampanje i 1080×1920 og 1920×1080: kun-liggende-fil, kun-stående-fil, begge, PDF-sider, video. (Egen dev-port + markørverifisering, jf. kjent stale-server-felle.)
- **Ekte brukersti:** last opp ekte JPG + PDF + PPTX gjennom admin-UI mot ekte bucket (MIME-typene finnes i migrasjon 039, men stien skal bevises, ikke antas).
- `render-decks.mjs` kjøres mot et testelement med stående PPT og verifiserer `portraitPages`.

## Known non-CMS

Selve blur-fill-oppførselen, per-side default (8 s) og maks 6 sider er systemkonstanter — ikke kunde-redigerbart innhold.

## Berørte filer

- `src/app/admin/innhold/actions.ts` — ImageMode-union, buildBody, validering, audience «begge»
- `src/app/admin/innhold/_components/content-form.tsx` + `edit-content-view.tsx` — visningsvalg, to slots, mål-tekster, aspekt-hint
- `src/app/widget/_shared/fullscreen-media.tsx` — NY delt komponent
- `src/app/widget/nyheter/news-rotator.tsx`, `tilbud/*`, `kampanje/kampanje-rotator.tsx` — innplugging
- `src/lib/content/live.ts` — audience «begge», eksponer portrait-felter
- `src/app/widget/preview/page.tsx` — preview-støtte
- `scripts/check-pending-decks.mjs`, `scripts/render-decks.mjs` — portrait-deck + PDF-rendering
