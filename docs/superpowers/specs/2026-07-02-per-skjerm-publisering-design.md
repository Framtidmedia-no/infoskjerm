# Per-skjerm-publisering + kallenavn på skjermer — design

**Dato:** 2026-07-02 · **Status:** godkjent retning fra Frank («Vi må ha den funksjonaliteten. Da må også tenantene kunne gi de kallenavn selv?»)

## Problem

Innhold kan i dag målrettes `all | stores | tags` (`content_targets`), pluss indirekte
via flate (kunde/intern) og avdeling. Har en butikk to skjermer med samme flate +
avdeling, finnes ingen måte å publisere til bare én av dem. Skjermer har heller ikke
redigerbare kallenavn — kiosk-kort heter «Kiosk-skjerm (kunde)» og Xibo-skjermer viser
Xibo-navnet, så en skjermvelger i publiseringsflyten ville vært ubrukelig uten navn.

## Løsning

### 1. Datamodell (én additiv migrasjon, timestamp-prefiks)

- `content_targets.screen_id uuid references screens(id) on delete cascade` (nullable)
  - partial index på `screen_id`.
- `screens.name` finnes allerede (`text not null`) — kallenavn trenger ingen skjemaendring,
  bare redigerings-UI + action.

### 2. Målrettings-semantikk

- `TargetMode` utvides: `"all" | "stores" | "tags" | "screens"`.
- Et innslag målrettet mot skjermer vises **kun** på akkurat de skjermene — også når
  widgeten lastes uten skjermkontekst (gamle `?store=`-URLer, forhåndsvisning), vises
  det ikke. Flate/avdeling/gyldighetsvindu filtrerer fortsatt som før.
- Skjerm-målretting krysser aldri tenant: leveringen er allerede tenant-scopet, og
  lagring filtrerer innsendte screenIds mot tenantens egne skjermer.

### 3. Levering (`/skjerm/<token>` → widget → `fetchLiveContent`)

- `/skjerm/[token]` selecter også `id` og legger `screen=<id>` på widget-URL-en.
- Widgetene `tilbud`, `kampanje`, `nyheter`, `bakrom` leser `?screen=` og sender den til
  `fetchLiveContent(storeId, types, audience, avdeling, screenId)`.
- Målrettingslogikken trekkes ut i en ren funksjon `matchesTargets()` i
  `src/lib/content/targeting.ts` (testbar uten Supabase): screen-targets har forrang;
  ellers gjelder dagens `target_all`/store/tag-regler uendret.

### 4. Admin — publisering (`content-form.tsx`)

- Ny knapp «Skjermer» i «Vis på»-raden (synlig for alle roller — butikkroller ser bare
  egne butikkers skjermer siden skjermlista filtreres mot deres `stores`-liste).
- Skjermliste gruppert per butikk med kallenavn + flate/avdeling-merke; rekkevidde-
  teksten viser «→ Vises på N skjermer». Draft-lagring og redigering bevarer valget.
- `loadScreenOptions()` ved siden av `loadStoreOptions()` i `store-options.ts`.

### 5. Admin — kallenavn (`/admin/skjermer`)

- Ny server action `renameScreen(screenId, name)` (`requireRole` samme roller som øvrige
  skjerm-actions, trim + maks 60 tegn, audit-logg, revalidate).
- `ScreenRowLite` får `name`; kortene viser navnet med blyant-ikon → inline input
  (Enter/blur lagrer, Escape avbryter). Xibo-kort uten rad viser fortsatt Xibo-navnet;
  kallenavn kan settes så snart skjermen er bundet (rad finnes).

## Avviste alternativer

- **`screens`-array i body-JSON** (som `avdeling`): slipper migrasjon, men targeting bor
  i `content_targets` — å splitte den over to steder gjør spørringer og vedlikehold verre.
- **Egen kallenavn-kolonne (`nickname`)**: `name` finnes og brukes ikke til noe annet enn
  default-verdier i dag; én kilde til navn er enklere.
- **Skjermvalg som tillegg til butikkvalg (kombinert modus)**: mer kraft, men uklar UX
  («valgte butikker PLUSS disse skjermene?»). Enkeltvalgt modus matcher dagens modell.

## Testing

- Vitest: `targeting.test.ts` dekker ren målrettingslogikk (screen-forrang, target_all,
  store, tag, uten skjermkontekst). Kjøres `vitest run src` (e2e-specs henger ellers).
- `pnpm build` + lint på berørte filer.
- Migrasjon kjøres mot prod (additiv, prosjekt `fcxwrfmdvfjulhoebceq` verifiseres først).

## Known non-CMS

Ingen nye hardkodede kundeflater — ren systemtekst i admin-UI (norsk) er tillatt per
CLAUDE.md pkt. 5.
