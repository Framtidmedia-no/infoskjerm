# Infoskjerm — gjenstående arbeid (plan)

**Oppdatert:** 2026-06-28
**Mål:** Komplett white-label signage-CMS for Gange-Rolv, drevet av self-hosted Xibo, med nettleser-forhåndsvisning av skjermene.

Denne planen er «huskelista» — alt som gjenstår, i prioritert rekkefølge. Hak av etter hvert.

---

## Status (ferdig)
- [x] Xibo CMS på Hetzner (https://xibo.framtidtech.no, HTTPS via Caddy)
- [x] Xibo API-tilgang (OAuth2, secrets i Vercel/GitHub/.env)
- [x] 16 butikker som Xibo display groups + Supabase `stores` (samme navn, by-feil rettet)
- [x] infoskjerm-appen ryddet (all gammel custom-signage slettet)
- [x] `/admin/cms` viser butikker/skjermer live fra Xibo
- [x] Innholds-CMS `/admin/innhold`: opprett/rediger/dupliser/slett/publiser, Tiptap-editor, bilde, målretting (alle/butikker/tagger), fra/til-dato, råflotte kort, søk/filter/paginering
- [x] RLS fikset på alle tabeller (content_targets, user_stores, tenants, screen_playlists)
- [x] Butikk-tilgang per bruker (user_stores)
- [x] Vær/salgstall fjernet fra «publiserbart» (de er per-enhet-widgets)

## Beslutninger tatt
- **Vær = Yr.no** (ikke OpenWeatherMap). Gratis, norsk.
- **Test = nettleser-forhåndsvisning** først (ingen RPi ennå). RPi/Arexibo kommer når maskinvare finnes.
- **Frank styrer prioritet**, men alt skal med.

---

## FASE 1 — Nettleser-forhåndsvisning av skjermen (HØYEST verdi)
Mål: se sluttresultatet per butikk i nettleseren, drevet av Supabase-innhold.

- [ ] Rute `/skjerm/[storeId]` (offentlig/token-beskyttet) som rendrer en 16:9-skjerm
- [ ] Base-layout: klokke + dato (øverst/hjørne), Yr-vær (sidepanel, butikkens sted), roterende innhold (hovedsone)
- [ ] Hent innhold per butikk: `content_items` der status=live OG (target_all ELLER store_id=denne ELLER tag matcher butikkens tagger) OG innenfor valid_from/valid_to
- [ ] Roter mellom innholdselementene (nyhet/tilbud/konkurranse) med fade
- [ ] Render HTML-body (fra Tiptap) + bilde pent på skjerm-skala (gjenbruk «ScaledScreen»-ideen: 1920×1080-referanse skalert)
- [ ] Forhåndsvis-knapp per butikk i `/admin/cms` og `/admin/stores`
- [ ] `ScaledScreen`-komponent (slettet tidligere) gjenoppbygges

## FASE 2 — Yr.no vær-widget
- [ ] API-rute `/api/yr?lat=&lon=` som henter fra Yr (locationforecast/2.0/compact), cache 30 min, riktig User-Agent
- [ ] Butikkene mangler lat/long → fyll inn koordinater per butikk (16 stk) i Supabase `stores`
- [ ] Vær-komponent: i dag/tempen + 5-dagers, pent design
- [ ] Brukes i FASE 1-forhåndsvisningen per butikk

## FASE 3 — Stillingsannonser (intern rekruttering)
- [ ] Migrasjon: utvid `content_type`-enum med `job` (+ regenerer database.types.ts)
- [ ] Stillingsfelt i `content_items.body`: stillingstittel, butikk, stillingstype (deltid/heltid), kontaktperson, kontakt-epost, søk-lenke
- [ ] Egen form-variant når type=job (butikkvalg påkrevd)
- [ ] Render-mal for stilling på skjerm (som eksempelet: bilde + tittel + butikk + kontakt)
- [ ] (Senere) bursdagshilsen + ticker som egne typer

## FASE 4 — CMS → Xibo-synk
- [ ] Velg rendering-vei: DataSet-filtrering vs gruppe-planlegging (spike mot Xibo API)
- [ ] Ved publisering: push innhold til Xibo (DataSet-rad / layout) målrettet butikkenes display groups
- [ ] Mapping `content_items` ↔ Xibo-objekt for redigering/sletting (lagre xibo-id på content_item)
- [ ] Bilde: last opp til Xibo media-bibliotek via API ELLER bruk Supabase Storage-URL

## FASE 5 — Xibo base-layout (malen)
- [ ] Bygg base-layout i Xibo via API: soner (klokke, Yr-vær per display, nyhets-region/DataSet, ticker)
- [ ] Vær per enhet: display ref-felt (lat/long) → widget henter butikkens sted
- [ ] Planlegg base-layout til alle display groups
- [ ] Verifiser i Xibo-forhåndsvisning

## FASE 6 — Raspberry Pi (når maskinvare finnes)
- [ ] Arexibo-spiller på RPi 5, registrer mot CMS, legg i butikk-gruppe
- [ ] Dokumenter oppsett (gjenbruk eksisterende kiosk-mønster)
- [ ] Test ekte skjerm i én butikk

## Tverrgående / opprydding
- [ ] Brukerstyring ferdig: invitasjon (Resend), roller (tenant-/flerenhets-/enhets-/super-admin), tilgang ferdig testet
- [ ] Tag-administrasjon på `/admin/stores` (opprett tagger som FERSKVARE/Nettbutikk, tildel butikker) — delvis påbegynt (stores-board)
- [ ] Per-rolle datafiltrering: enhetsadmin ser/redigerer kun sine butikkers innhold (RLS-forfining utover tenant-isolasjon)
- [ ] DNS: xibo.framtidtech.no henger i Franks lokale cache (offentlig OK) — ufarlig
- [ ] Xibo /fonts/view intern admin-feil — lav prioritet (kunden ser ikke Xibo)
- [ ] GDPR: oppdater Framtid Tech AS art.30-protokoll (Xibo/Hetzner som underdatabehandler, butikksjef-PII)
- [ ] Roter Hetzner API-token (ble limt i klartekst)

---

## Arkitektur-notat
- **Supabase** = authoring + identitet + per-butikk-innhold (sannhet for redigering)
- **Nettleser-forhåndsvisning** = rask visuell test, rendrer Supabase-innhold (FASE 1)
- **Xibo** = produksjonsmotor for ekte RPi-skjermer (FASE 4–6)
- Begge rendrer samme per-butikk-modell (target_all / store / tag + valid-periode)
