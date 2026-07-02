# Raspberry Pi — oppsett av infoskjerm

> ⚠️ **UTDATERT — gjelder den gamle Chromium-kiosk-arkitekturen** (`/screen/<token>`,
> slettet). Flåten kjører nå **Arexibo/Xibo**: oppskrift i
> [docs/oppsett-raspberrypi.md](../docs/oppsett-raspberrypi.md), enhetsregister i
> [docs/raspberry-enheter.md](../docs/raspberry-enheter.md). Automatisk TV-av/på
> etter åpningstider = **`scripts/pi/tvpower/`** (HDMI-CEC-agent, steg 9 i oppskriften).

Komplett guide for å sette opp en fysisk skjerm (Raspberry Pi + TV) som henter
innhold fra dette prosjektet og kan fjernstyres (av/på, reload, omstart) fra admin.

## 1. Maskinvare

| Del | Anbefaling |
|-----|------------|
| Datamaskin | Raspberry Pi 4 Model B, 4 GB |
| Lagring | 32 GB microSD, Class 10 / A1 |
| Skjerm | Vanlig TV med HDMI (LG/Samsung støtter HDMI-CEC for av/på) |
| Kabel | micro-HDMI → HDMI |
| Nett | Ethernet anbefalt, WiFi støttes |
| Strøm | Offisiell Pi 4 USB-C strømforsyning |

> Ingen touch nødvendig — skjermene er kun visning.

## 2. Installer operativsystemet

1. Last ned **Raspberry Pi Imager** (raspberrypi.com/software).
2. Velg **Raspberry Pi OS Lite (64-bit)** (Bookworm). «Lite» = uten skrivebord, raskest.
3. Klikk tannhjulet (⚙️) før skriving og sett:
   - **Hostname**: f.eks. `moa-skjerm-1`
   - **Aktiver SSH** (passord eller nøkkel)
   - **Brukernavn/passord** (f.eks. `pi`)
   - **WiFi** (hvis ikke ethernet) + land `NO`
4. Skriv til SD-kortet, sett det i Pi-en, koble til TV og nett, slå på.

## 3. Hent skjerm-token fra admin

1. Logg inn på admin: <https://infoskjerm-seven.vercel.app>
2. Gå til **Innstillinger → Registrerte enheter → Legg til enhet**.
3. Velg butikk (f.eks. EUROSPAR MOA), generer URL, og kopier **token**
   (delen etter `/screen/`).

## 4. Kjør oppsett-scriptet på Pi-en

SSH inn på Pi-en (`ssh pi@moa-skjerm-1.local`) og kjør:

```bash
curl -sSL https://raw.githubusercontent.com/frlund3/infoskjerm/main/pi/setup.sh \
  | sudo SCREEN_TOKEN=gr_dittlange_token bash
```

Scriptet installerer alt, konfigurerer autostart og fjernstyring. Når det er
ferdig: `sudo reboot`. Pi-en booter rett inn i fullskjerm-visningen.

## 5. Slik fungerer fjernstyringen

Pi-en når aldri åpnes utenfra (ingen porter). I stedet **poller** den prosjektet
hvert 30. sekund og utfører ev. kommandoer:

| Kommando | Effekt | Hvordan |
|----------|--------|---------|
| `power_off` | Slår av TV-en | HDMI-CEC `standby` |
| `power_on`  | Slår på TV-en | HDMI-CEC `on` |
| `reload`    | Laster skjermen på nytt | starter kiosk-tjenesten |
| `reboot`    | Starter Pi-en på nytt | `reboot` |

Samme puls oppdaterer `last_seen_at` så admin ser online/offline-status.

### Sende kommando manuelt (inntil admin-knappene er koblet på)

```sql
-- skru av skjermen på MOA
update screens set pending_command = 'power_off'
where name = 'EUROSPAR MOA – Hoveddisplay';
```

### Automatisk av/på etter åpningstider

Legg en cron-jobb på Pi-en (eller send kommandoer fra admin på timeplan):

```bash
sudo crontab -e
# på kl 07:00, av kl 23:00 (man–søn)
0 7  * * * echo 'on 0'      | cec-client -s -d 1
0 23 * * * echo 'standby 0' | cec-client -s -d 1
```

## 6. Feilsøking

```bash
journalctl -u infoskjerm-kiosk -f     # visningen
journalctl -u infoskjerm-agent -f     # fjernstyring/puls
cat /etc/infoskjerm/config.env        # konfig
echo 'scan' | cec-client -s -d 1      # ser Pi-en TV-en over CEC?
```

- **Svart skjerm**: sjekk at TV-en står på riktig HDMI-kilde, og at
  `infoskjerm-kiosk` kjører.
- **CEC virker ikke**: aktiver CEC i TV-menyen (heter ofte «Simplink» (LG),
  «Anynet+» (Samsung), «Bravia Sync» (Sony)).
- **«Ugyldig skjerm-token»**: token finnes ikke / er deaktivert i admin.
