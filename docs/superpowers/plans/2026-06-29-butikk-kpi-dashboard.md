# Plan: Butikk-KPI-dashbord (driftstall på ansatt-skjermer)

> Status: planlagt 2026-06-29. Kilde-data verifisert live mot Gange-Rolv Drift.

## Mål
Vise **driftstall per butikk** på en råflott måte på **ansatt-/bakromsskjermer** (IKKE kundeskjermer): siste innleste uke + hittil i år, med omsetning vs budsjett/fjorår, bruttomargin, lønnsandel, svinn, og en trendgraf over året.

## Avgjorte rammer (fra Frank)
- **Publikum:** kun ansatte (bakrom/pauserom). Egen display-gruppe + egen layout. Aldri på kunde-signagen.
- **Dataflyt:** daglig sjekk **kl 14:00** for nye tall → synk til infoskjerm-DB. Skjermene leser kun infoskjerm.
- **Innhold:** omsetning vs budsjett + fjorår · bruttomargin + lønn% · svinn · trendgraf over året.

## Datakilde (verifisert)
**Gange-Rolv Drift**, Supabase ref `trpfhwsfotgbiewaofqr` (West EU, org `mwftelwachyidiajjnib`).
Hovedtabell **`bonus_nokkeltall`** — én rad per butikk per uke:

| Felt | Betydning |
|------|-----------|
| `butikk_id` (int), `uke`, `ar` | nøkkel (butikk × uke × år) |
| `netto_omsetning` | omsetning (kr) |
| `budsjett_omsetning` | budsjett omsetning |
| `netto_omsetning_fjoraaret` | omsetning samme uke i fjor |
| `brutto_kr`, `budsjett_brutto_kr` | bruttofortjeneste (kr) + budsjett |
| `lonn_kr`, `budsjett_lonn` | lønnskostnad (kr) + budsjett |
| `svinn_total`, `svinn_total_fjoraaret`, `budsjett_svinn_gras` | svinn (kr) + fjorår + budsjett |
| `importert_tidspunkt` | når raden ble importert (= ferskhet) |

- **Mapping:** `butikker.butikk` (navn) matcher **eksakt** infoskjerm `stores.name` (EUROSPAR ÅLESUND STORSENTER, …). Map på navn. `butikkid 1000 = GANGE-ROLV AS` = kjede-totalen (kan vises som «alle butikker»).
- **Ferskhet i dag:** 2026 uke 25, importert 22. juni; 15 butikker har tall (SPAR FISKÅ mangler i Drift).
- **Avledede nøkkeltall:** bruttomargin% = `brutto_kr/netto_omsetning`; lønn% = `lonn_kr/netto_omsetning`; svinn% = `svinn_total/netto_omsetning`; %-av-budsjett og %-mot-fjorår direkte. Hittil-i-år = SUM over uker der `ar = inneværende år`.
- **Personvern:** dette er forretnings-/driftstall (aggregert per butikk), **ikke personopplysninger** (`lonn_kr` er samlet lønnskostnad, ikke individuell lønn). Ingen art.30-endring. Konfidensielt forretningsmessig → derfor kun ansatt-skjermer.

## Arkitektur

```
Drift (bonus_nokkeltall)  ──[daglig 14:00 synk]──>  infoskjerm.store_kpi_week  ──>  /widget/butikk-kpi  ──>  Xibo (ansatt-layout)  ──>  bakroms-skjerm
```

### 1. Synk (daglig 14:00)
- **Vercel cron** i `vercel.json`: `/api/cron/sync-kpi` på `0 12 * * *` UTC (= 14:00 norsk sommertid CEST; juster til `0 13 * * *` om vinteren, eller bruk en TZ-bevisst sjekk).
- Cron-en leser Drift `bonus_nokkeltall` (+ `butikker`) via en **server-only Drift-lesenøkkel** (egen secret `DRIFT_SUPABASE_URL` + `DRIFT_SUPABASE_SERVICE_KEY`, kun brukt i cron — aldri i klient). Hardere variant senere: dedikert read-only Postgres-rolle i Drift.
- Upsert til ny infoskjerm-tabell **`store_kpi_week`** (`store_id` ↔ mappet på navn, `uke`, `ar`, alle KPI-feltene, `synced_at`). Idempotent på (`store_id`,`uke`,`ar`).
- Beskyttet med `CRON_SECRET` (finnes alt i prosjektet).
- Logger hvor mange rader/uker som ble oppdatert; no-op hvis ingen nye `importert_tidspunkt`.

### 2. Datamodell i infoskjerm
- Migrasjon `018_store_kpi_week.sql`: tabell `store_kpi_week` + indeks (`store_id`,`ar`,`uke`). RLS: lese for innloggede admin-roller; service role skriver.
- Mapping butikk-navn → `stores.id` gjøres i cron (oppslag på `stores.name`).

### 3. KPI-widget (`/widget/butikk-kpi?store=<id>`)
App-rendret, fullskjerm, leser `store_kpi_week` (service role, server-side). Per butikk:
- **Header:** butikknavn + «Uke 25 · 2026» + «sist oppdatert».
- **3 KPI-kort (siste uke):** Omsetning (stort tall + ▲/▼ % mot budsjett og fjorår), Bruttomargin% (mot budsjett), Lønn% (mot budsjett). Fargekodet.
- **Svinn-kort:** svinn kr + svinn% siste uke + mot fjorår.
- **Hittil i år-rad:** akkumulert omsetning + % av budsjett + % mot fjorår.
- **Trendgraf:** håndtegnet SVG (ingen tung dep) — omsetning per uke (søyler) med budsjett-linje, evt. svinn%-linje. Råflott, animert inn.
- Roterer evt. mellom butikker, eller én butikk per skjerm (avhengig av oppsett). «Alle butikker»-variant = `butikkid 1000` + topp-/bunnliste.
- Auto-refresh (leser ny synk neste dag).

### 4. Xibo — egen ansatt-layout + display-gruppe
- Ny **display-gruppe** «Ansatt/Bakrom» (eller per-butikk bakrom).
- Ny **layout** «Gange-Rolv – KPI» som embedder `/widget/butikk-kpi` (fullskjerm, evt. + klokke). Planlegges til ansatt-gruppa (Always).
- Egen builder `scripts/xibo/build-kpi-layout.mjs` (gjenbruker `lib.mjs`-mønsteret).
- Bakroms-Pi legges i ansatt-gruppa → viser KPI-dashbordet. Kundeskjermer er i butikk-gruppene (5–20) og påvirkes ikke.

## Sikkerhet/risiko
- Drift-nøkkel kun server-side i cron (aldri klient). `/widget/butikk-kpi` leser infoskjerm-DB, ikke Drift.
- KPI-skjermer fysisk plassert i bakrom; aldri i kunde-soner. Ansatt-display-gruppe holder dem adskilt fra kunde-layoutene.
- Konfidensielt, men ikke persondata → ingen GDPR-protokoll-endring.

## Faser
1. **Migrasjon + synk:** `store_kpi_week` + `/api/cron/sync-kpi` + Vercel-cron + Drift-secrets. Verifiser at uke 25-tall lander i infoskjerm.
2. **KPI-widget:** `/widget/butikk-kpi` med kort + SVG-trendgraf (siste uke + hittil i år).
3. **Xibo:** ansatt-display-gruppe + KPI-layout + planlegging + builder.
4. **Polish:** «alle butikker»-oversikt, animasjoner, evt. rotasjon mellom butikker.

## Åpne punkter
- Norsk sommertid/vintertid på cron (UTC) — bekreft 14:00-treff hele året.
- SPAR FISKÅ mangler i Drift — vis «ingen tall» pent.
- Skal hver bakroms-skjerm vise kun sin butikk, eller alle 16? (Default: sin egen + en «alle»-oversikt i rotasjon.)
