# 📋 Raspberry Pi-enhetsregister (Gange-Rolv infoskjerm)

**Kilden til sannhet for hele skjermflåten.** Hver fysiske Pi vi setter opp føres her —
hostnavn, rolle, Xibo-ID, MAC, Connect-status. Oppsett-oppskriften ligger i
[oppsett-raspberrypi.md](oppsett-raspberrypi.md); dette er *inventaret*.

> 🔎 **Finn alltid igjen:** denne fila + Xibo (`xibo.framtidtech.no` → Displays) +
> Raspberry Pi Connect-konsollen (tagg `gangerolv`). Tre steder, samme enheter.

## Hele flåten

| Butikk | Hostnavn | Rolle | Xibo-ID | Xibo-gruppe (id) | Rotasjon | Auto-start | Connect | TV-agent | Satt opp |
|--------|----------|-------|---------|------------------|----------|-----------|---------|----------|----------|
| EUROSPAR MOA | `gr-eurospar-moa1` | Kundeskjerm | 1 | EUROSPAR MOA (9) | `right` (portrett) | ✅ getty | ✅ org | ✅ * | 2026-06-30 |
| EUROSPAR MOA | `gr-eurospar-moa2` | Bakrom/intern | 2 | EUROSPAR MOA – Bakrom (25) | `normal` | ✅ getty | ✅ org | ⬜ | 2026-06-30 |

\* TV-agent installert og rapporterer til appen — men TV-kontroll (av/på via CEC) er ikke fysisk
verifisert ennå: ved installasjon 2026-07-03 var ingen TV synlig på HDMI (`tvState=unknown`).
Når Pi-en står ved TV-en: sjekk at CEC er PÅ i TV-menyen (Anynet+/SimpLink/Bravia Sync) og
test «Slå av nå / Slå på nå» fra skjermkortet i admin.

Status: **2 / 32 skjermer ferdig** (16 butikker × ~2 skjermer). Oppdater raden når en Pi fullføres.
Begge MOA-skjermer kjører nå **getty-autologin + fbdev fjernet** (riktige farger) og er meldt inn i **Framtid Tech AS** (org-auth-key, headless).

## Tekniske detaljer per enhet

### EUROSPAR MOA

**`gr-eurospar-moa1` — Kundeskjerm** ✅ ferdig
- Xibo: display-id **1**, GUID `e1ac4d024f0d4d9c8ea5bfd8bbde915d`, gruppe «EUROSPAR MOA» (9)
- MAC: wlan0 `88:a2:9e:ed:b1:e2` · eth0 `88:a2:9e:ed:b1:e1`
- Rotasjon `right` (portrett 1080×1920) · viser hele butikken (`/widget/tilbud?store=…`)
- Connect: signed in (remote shell + screen allowed, linger on)
- TV-agent: installert 2026-07-03 (`infoskjerm-tvpower.timer`, poller hvert minutt, token fra
  skjermkortet «EUROSPAR MOA kunde»). Fysisk CEC-test gjenstår — se fotnoten i flåtetabellen.

**`gr-eurospar-moa2` — Bakrom/intern** ✅ ferdig
- Xibo: display-id **2**, gruppe «EUROSPAR MOA – Bakrom» (25), viser layout 163
- MAC: wlan0 `88:a2:9e:f2:e0:18`
- Rotasjon `normal` (liggende) · getty-autologin-kiosk · fbdev fjernet (riktige farger) · Connect signed-in
- ⚠️ Bakrom-layouten viser foreløpig **kun én KPI-side** — skal fylles med mer internt innhold.

## Felles fakta (gjelder alle)

- **Xibo CMS:** `https://xibo.framtidtech.no` (self-hosted, Hetzner `157.180.73.205`, docker). Claude har root.
- **CMS Secret Key** (player-registrering): `r0uj9yS6`
- **SSH-bruker på Pi-ene:** `frlund3` (passordløs nøkkel lagt inn av Claude)
- **Hostnavn-konvensjon:** `gr-<butikk><nr>` — kunde = `1`, bakrom = `2`
- **Gruppe-konvensjon:** kunde = butikknavnet eksakt; bakrom = «{butikk} – Bakrom»
- **WiFi:** vårt nett under oppsett → `kundenett` ved utplassering i butikk

## Hent live-status (når som helst)

```bash
# Alle displays i Xibo (id, navn, lisensiert, sist sett, IP, MAC) — fra repo-rot
node -e 'import("./scripts/xibo/lib.mjs").then(async m=>{const e=m.loadEnv();const a=m.makeApi(e,await m.getToken(e));for(const d of await a("/display?length=500"))console.log(d.displayId,d.display,"lic="+d.licensed,d.clientAddress,d.lastAccessed)})'

# En enkelt Pi (når den er på): SSH + status
ssh frlund3@<ip> 'systemctl is-active arexibo; rpi-connect status'
```

---
*Oppdater denne fila hver gang en Pi settes opp eller endrer rolle/butikk.*
