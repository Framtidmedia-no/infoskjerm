# Åpningstider + automatisk TV-styring (HDMI-CEC) — design

**Dato:** 2026-07-02 · **Status:** godkjent av Frank (chat) · **Gren:** `feat/apningstider-tv-styring`

## Mål

Butikkene skal slippe å skru av/på TV-ene manuelt. Admin setter åpningstider per
butikk; skjermene slår seg på litt før åpning og av litt etter stenging — fysiske
TV-er via HDMI-CEC på Raspberry Pi-ene, kiosk-skjermer (telefon/nettbrett) via en
svart hvilevisning i nettleseren.

## Arkitektur (valgt: app-styrt polling)

Pi-ene står bak butikk-NAT og kan ikke nås utenfra — men de har utgående nett.
Arexibo støtter ikke Xibo-kommandoer (spilleren er «incomplete»), så Xibo-native
scheduling er utelukket. Løsningen:

```
stores.apningstider (jsonb)          admin-UI (butikkside)
        │
        ▼
src/lib/power/schedule.ts  ←── ren, testet beregning (Europe/Oslo)
        │
        ▼
POST/GET /api/screen/power?token=…   (service-role, token = kapabilitet)
        ▲                    ▲
        │                    │
  Pi-agent (systemd-timer,   /skjerm/<token> (SleepGate poller
  curl + cec-ctl hvert min)   hvert minutt → svart hvilevisning)
```

All logikk bor sentralt. Pi-en er dum: «skal TV-en være på nå?» → utfør med CEC
→ rapporter faktisk TV-status tilbake (vises i admin).

## Datamodell (migrasjon `20260702*_apningstider_tv_styring.sql`)

- `stores.apningstider jsonb` — `{mon..sun: {opens:"07:00",closes:"23:00"} | null}`.
  `null`-dag = stengt. Kolonnen `NULL` = aldri konfigurert → **skjermene står alltid på**
  (trygg default: manglende konfig skal aldri svarte skjermer).
- `screens.power_mode` — `auto` (følg åpningstider) | `always_on`. Default `auto`.
- `screens.power_on_lead_min` (default 15) / `screens.power_off_lag_min` (default 15).
- `screens.power_override` (`on`/`off`) + `screens.power_override_until` — manuell
  overstyring fra admin, gjelder til neste planlagte overgang (beregnes ved klikk).
- `screens.power_state` (fantes fra 010) gjenbrukes som sist rapporterte TV-status,
  ny `screens.power_state_at` for tidspunktet.

## Beregning (`src/lib/power/schedule.ts`)

Ren TS, minutt-rom relativt til Oslo-midnatt (DST-trygt nok — grensene treffes
aldri 02–03 om natten når butikker er stengt). Per dag-offset −1..+7: intervall
`[opens − lead, closes + lag]`; `closes ≤ opens` → krysser midnatt (+24 t).
Prioritet: `always_on` → aktiv override → intervall-sjekk. Returnerer
`{desired, reason, nextTransitionMin}` for statuslinjer i UI og override-utløp.

## API (`/api/screen/power`)

- `GET ?token=` → `{ok, desired, reason, nextTransition, serverTime}` — brukes av
  kiosk-visningen og admin.
- `POST {token, tvState, info?}` → oppdaterer `power_state`/`power_state_at`/
  `last_heartbeat`/`app_info` og returnerer `desired` — én rundtur for Pi-agenten.
- Service-role (samme mønster som `/skjerm/<token>`); token er kapabiliteten.

## Admin-UI

- **Butikkside:** nytt «Åpningstider»-kort — 7 dager, åpen/stengt-toggle, tidsvelgere,
  «kopier til alle hverdager», live «Åpent nå / Stengt»-status. Server action
  `updateStoreApningstider` (audit-logges).
- **Skjermkort (StoreScreens):** strømseksjon per skjerm — TV-status-badge (fra
  Pi-rapport), modus (Følg åpningstider / Alltid på), «Slå av/på nå» (override til
  neste overgang), statuslinje («Slår av 23:15»). Actions audit-logges.

## Kiosk-hvilevisning

`/skjerm/<token>` wrappes i `SleepGate` (client): poller GET hvert minutt; `off` →
helsvart visning med dempet klokke + «Åpner 07:00». Widgeten avlastes (iframe
unmountes) mens den sover.

## Pi-agent (`scripts/pi/tvpower/`)

`install.sh` (kjøres over SSH per Pi, del av golden image) legger inn:
- `/usr/local/bin/infoskjerm-tvpower` — POST status → få `desired` → sammenlign med
  `cec-ctl --give-device-power-status` → `--image-view-on`+`--active-source` / `--standby`.
- systemd service + timer (hvert minutt). Konfig i `/etc/infoskjerm/tvpower.env`
  (APP_URL + SCREEN_TOKEN fra skjermkortet i admin).
- Krever `v4l-utils` (kernel-CEC, uavhengig av X/Arexibo). CEC må være PÅ i TV-menyen
  (Anynet+/SimpLink/Bravia Sync).

## Avgrensninger

- Helligdager/datounntak: ikke i v1 — manuell override dekker unntakene.
- `pi/`-mappen (gammel Chromium-kiosk) berøres ikke ut over deprecation-banner.
- Xibo-layouter, RLS-policyer og eksisterende heartbeat-RPC-er endres ikke.

## Verifisering

- Vitest på schedule-lib (lead/lag, stengt dag, midnattskryss, override, defaults).
- `next build` + Playwright innlogget mot admin (åpningstider-kort + skjermkort).
- Fysisk CEC-test på `gr-eurospar-moa2` gjøres ved utrulling (egen oppgave — TV-modell
  avgjør; agenten logger og rapporterer `unknown` hvis CEC ikke svarer).
