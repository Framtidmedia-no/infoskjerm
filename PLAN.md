# PLAN — infoskjerm (START HER for ny chat)

White-label digital signage-CMS for **Gange-Rolv** (16 SPAR/EUROSPAR/JOKER-butikker), drevet av self-hosted **Xibo**. Appen (Next.js/Supabase/Vercel) er kundens ansikt; Xibo er den skjulte visningsmotoren for Raspberry Pi-skjermer.

> Detaljert handoff med API-oppskrifter: `docs/superpowers/HANDOFF-dynamisk-modell.md`
> Full plan: `docs/superpowers/plans/2026-06-28-infoskjerm-gjenstaende.md`

---

## Infrastruktur (ferdig satt opp)
- **Xibo CMS:** https://xibo.framtidtech.no (= `http://157.180.73.205`), v4.4.4, Docker på Hetzner. SSH: `ssh -i ~/.ssh/id_ed25519 root@157.180.73.205`, stack `/opt/xibo`.
- **Xibo API:** OAuth2 client-credentials. Secrets i Vercel + GitHub + `.env.local`: `XIBO_API_URL`, `XIBO_CLIENT_ID`, `XIBO_CLIENT_SECRET`. Klient: `src/lib/xibo/client.ts`.
- **Supabase:** prosjekt `fcxwrfmdvfjulhoebceq`. Tenant Gange-Rolv AS = `00000000-0000-0000-0000-000000000001`.
- **DNS/HTTPS:** xibo.framtidtech.no via Vercel DNS + Caddy/Let's Encrypt.
- **Server:** Hetzner `framtid-xibo` (cx23, Helsinki). Hetzner API-token ble lekket i klartekst → BØR roteres.

## Ferdig bygget
- 16 butikker som Xibo display groups (= Supabase `stores`, samme navn)
- App ryddet for all gammel custom-signage; kun Xibo-drevet
- `/admin/cms` — viser butikker/skjermer live fra Xibo
- `/admin/innhold` — komplett CMS: opprett/rediger/dupliser/slett/publiser, Tiptap HTML-editor, bilde (Supabase Storage), typer (nyhet/konkurranse/tilbud), målretting (alle/butikker/tagger), fra/til-dato, råflotte kort, søk/filter/paginering
- `/admin/users` — roller + butikk-tilgang per bruker (`user_stores`)
- `/admin/stores`, `/admin/settings` (branding) — ryddet
- RLS fikset på alle tabeller
- **Bevist:** CMS-publisering → ekte Xibo-render (forhåndsvist i nettleser)
- Xibo DataSet **«Nyheter» (dataSetId=1)** opprettet: kolonner tittel, tekst, bilde, type, butikker, fra, til, contentId

---

## ARKITEKTUR (gjeldende)

Publisering skriver til **Supabase `content_items`** (kilden). Skjermene viser innhold via **app-rendrede webpage-widgets** som Xibo embedder — full designkontroll i Next.js, ikke Xibos stive DataSet/maler. Xibo står for skjermstyring + planlegging.

**Widgets (offentlige, leser live fra Supabase via service role):**
- `/widget/nyheter?store=<id>` — roterende nyhetskort + **ticker-overlay nederst** (kun når aktiv). Per-type kort: nyhet/konkurranse/tilbud/gratulerer (plakat- eller bakgrunnsbilde), **stilling** (QR «skann for å søke» + kontaktperson), **salgstall** (KPI-kort med ▲/▼). Autoscroll for lang tekst. Innhold parses til tekstblokker server-side (ingen rå-HTML → ingen XSS). Auto-refresh hvert 10. min.
- `/widget/vaer?lat=&lon=&navn=` — Yr-vær per butikk.

**Xibo-layout (3 soner, full høyde):** nyheter (1340×1000) · digital klokke+dato (480×230) · vær (480×740). Ingen egen ticker-region — ticker er overlay i nyhets-widgeten (ingen tom boks når den er tom).

- **Base-mal:** campaign 8 (`scripts/xibo/build-base-template.mjs`).
- **16 butikk-layouts:** campaign 12–27 (`scripts/xibo/build-store-layouts.mjs`), vær på butikkens koordinater + `?store=`-filtrert nyhets-/ticker-feed, **planlagt** til display-gruppe 5–20 (Always). Idempotent.
- Delt byggelogikk: `scripts/xibo/lib.mjs`. Endre design → rediger relevante widget-komponenter (app) + evt. `lib.mjs`, deploy, kjør builderne på nytt.

## FERDIG
- ✅ App-rendret nyhetssone med rike per-type-kort, plakat/bakgrunn-bildevalg, QR for stilling, KPI for salgstall, autoscroll, dato+forfatter-byline, type-merkelapp.
- ✅ CMS-drevet ticker-overlay (egen `ticker`-type), skjules når tom.
- ✅ Per-butikk vær + innholdsfiltrering (målretting + dato-vindu) + planlegging til display-grupper.
- ✅ Innholdstyper: nyhet, konkurranse, tilbud, **stilling** (kontaktperson + søknadslenke), **gratulerer** (bryllup/jubileum/bursdag), **salgstall** (manuelt KPI), **ticker**.
- ✅ Per-rolle datafiltrering (enhetsadmin ser kun egne butikkers innhold).
- ✅ GDPR art.30 (v1.9) — databehandler-prosjekt, Xibo/Hetzner underdatabehandler.
- ✅ `/widget/*` rammbar fra hvor som helst (CSP `frame-ancestors *`).

---

## DET SOM GJENSTÅR

### 🟢 Raspberry Pi-klargjøring (alt er klart på CMS-siden)
De 16 butikk-layoutene er **planlagt** til display-gruppene (5–20). Når en Pi melder seg inn og legges i riktig gruppe, vises butikkens layout automatisk. For å koble på en skjerm:
1. Flash Raspberry Pi OS (64-bit) på en Pi 4/5.
2. Installer Xibo-spiller for Pi (**Arexibo**, anbefalt) eller `xibo-player`.
3. Sett CMS-adresse `https://xibo.framtidtech.no` + **CMS-nøkkel** (Xibo → Innstillinger → CMS Secret Key) i spilleren.
4. I Xibo CMS → **Displays**: godkjenn (authorise) den nye skjermen.
5. Legg skjermen i butikkens **display-gruppe** (samme navn som butikken). Da pulles og vises butikkens planlagte layout (Always) automatisk.
6. **Global default-layout er satt** til base-malen (DEFAULT_LAYOUT=layout 92) i Xibo-DB-en, så uplasserte skjermer viser base-malen umiddelbart. ⚠️ Layout-id endres ved base-rebuild — re-sett da via SSH:
   `ssh -i ~/.ssh/id_ed25519 root@157.180.73.205 "docker exec xibo-cms-db-1 mysql -ucms -p\$(docker exec xibo-cms-db-1 printenv MYSQL_PASSWORD) cms -e \"UPDATE setting SET value='<ny base-layout-id>' WHERE setting='DEFAULT_LAYOUT';\""`

### ✅ Butikk-KPI-dashbord (ansatt-skjermer) — bygget
Driftstall fra Gange-Rolv Drift, synket daglig (~14:00) til `store_kpi_week` + `store_svinn_kommentert` via `/api/cron/sync-kpi`. Fullskjerm-dashbord `/widget/butikk-kpi?store=` (omsetning vs budsjett/fjorår, bruttomargin, lønn%, svinn, **svinn kommentert/ikke**, SVG-trendgraf, hittil-i-år). 16 KPI-layouts (campaign 28–43) planlagt til egne **bakrom-grupper** «{butikk} – Bakrom» (21–36) — aldri på kundeskjermer. Plan: `docs/superpowers/plans/2026-06-29-butikk-kpi-dashboard.md`.

### ✅ Alle-butikker-oversikt (ansatt-/ledelse-skjermer) — bygget
Rangert oversikt over alle 16 butikker side om side (omsetning vs budsjett/fjorår, brutto/lønn/svinn, 🥇🥈🥉), i to perioder: `/widget/kpi-oversikt` (**siste uke**) og `/widget/kpi-oversikt?periode=ar` (**hittil i år**). Begge layoutene roterer på HK-skjermen «Ledelse – Oversikt» **og på hver butikks bakrom** — slik at alle butikksjefer ser hvordan egen butikk ligger an mot resten av kjeden (egen KPI → alle butikker uke → alle butikker år). Konfidensielle driftstall — kun ansatt-/bakrom-skjermer, aldri kundeskjermer. Bygg: `node scripts/xibo/build-kpi-layouts.mjs`.

### 🟡 Resten
- **DPA Framtid Tech ↔ Gange-Rolv** + org.nr i art.30-protokollen (markert `[FYLL INN]`).
- Automatisk salgstall fra kassesystem (i dag manuelt KPI-kort) — egen integrasjon.
- Per-butikk redaktør-begrensning også i RLS (i dag filtrert i UI/server).

---

## Xibo-API-oppskrifter (verifisert v4.4)
**Lag/rebygg layout:** `POST /layout {name,resolutionId:1}` → parent. `PUT /layout/checkout/{id}` → draft (via `GET /layout?parentId={id}`). `POST /region/{draft} {type:frame,width,height,top,left}` → `regionPlaylist.playlistId`. `POST /playlist/widget/{type}/{playlistId}` (clock-digital/webpage/text/dataset). `PUT /playlist/widget/{widgetId} {...}`. `PUT /layout/publish/{parent} {publishNow:1}`. Layout-id endres ved publisering — adresser via **campaign-id** (stabil).
**Webpage-widget:** `{uri, transparency, modeid:"1", isPreNavigate:1, duration, useDuration:1}`.
**Planlegg:** `POST /schedule {eventTypeId:1, campaignId, displayGroupIds[], dayPartId:2 (Always)}`.
**Forhåndsvis:** `/campaign/{campaignId}/preview`.
