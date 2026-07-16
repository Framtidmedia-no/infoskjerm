# Golden image — flåteutrulling av infoskjerm-Pi-er

Mål: en ny butikkskjerm = **sett blankt SD-kort i Mac-en → én kommando → sett
kortet i Pi-en**. Ingen manuell OS-installasjon, ingen manuell registrering.

## Delene

| Fil | Kjøres på | Gjør |
|-----|-----------|------|
| `prepare-golden.sh` | Golden-Pi (via SSH) | Installerer den **sovende** firstboot-tjenesten. `HALT=1` slår av Pi-en for kloning. |
| `firstboot.sh` | Klonene (automatisk) | Personaliserer ved første boot: hostname, machine-id, SSH-nøkler, tvpower-token, rotasjon, ny Xibo-identitet, Connect-innmelding, valgfritt WiFi. |
| `capture-golden-image.sh` | Mac | Leser golden-SD-kortet → `~/infoskjerm-golden-YYYYMMDD.img.gz`. |
| `flash-pi.sh` | Mac | Oppretter/gjenbruker skjermrad i Supabase (token), skriver imaget til SD-kort, legger provision-fil på boot-partisjonen. |
| `../../xibo/adopt-display.mjs` | Mac | Autoriserer det nye displayet i Xibo + legger det i riktig skjermgruppe. |

## Engangs: lag golden image

1. Velg en **ferdig verifisert** Pi (alle 9 sjekklistepunkter ✅ — per 2026-07-03 er
   `gr-eurospar-moa2` beste kandidat).
2. Fra repo-rot, med Mac-en på samme nett som Pi-en:
   ```bash
   scp -r scripts/pi/goldenimage frlund3@<pi-ip>:/tmp/goldenimage
   ssh frlund3@<pi-ip> "sudo bash /tmp/goldenimage/prepare-golden.sh"          # installer (Pi kjører videre)
   ssh frlund3@<pi-ip> "sudo HALT=1 bash /tmp/goldenimage/prepare-golden.sh"   # …når klar: slå av
   ```
3. Trekk SD-kortet fra Pi-en, sett det i Mac-en:
   ```bash
   ./scripts/pi/goldenimage/capture-golden-image.sh
   ```
   (Leser hele kortet — 10–40 min. Output: `~/infoskjerm-golden-YYYYMMDD.img.gz`.)
4. Sett kortet **tilbake i golden-Pi-en** og gi strøm — den kjører videre som før
   (tjenesten sover uten provision-fil).

## Per ny Pi

```bash
# Blankt kort i Mac-en (samme størrelse eller større enn golden-kortet!):
./scripts/pi/goldenimage/flash-pi.sh gr-spar-butikk1 --butikk "SPAR Butikk"

# Med butikkens WiFi (ellers arver den nettene fra golden-imaget):
./scripts/pi/goldenimage/flash-pi.sh gr-spar-butikk2 --butikk "SPAR Butikk" \
    --wifi-ssid kundenett --wifi-pass 'passord'
```

Rolle utledes av hostnavnet (`…1` = kunde/portrett, `…2` = bakrom/liggende — overstyr
med `--rolle`). Sett kortet i Pi-en: den booter **to ganger** (fase 1: identitet →
reboot; fase 2: Connect-innmelding) og er så synlig i Connect-konsollen og som ny,
uautorisert skjerm i Xibo.

Deretter, fra Mac-en:
```bash
node scripts/xibo/adopt-display.mjs gr-spar-butikk1 --group "SPAR Butikk"
```
…og koble layout (build-widget-layout.mjs) hvis butikken er ny. Oppdater
`docs/raspberry-enheter.md` (flåteregisteret).

## Hvorfor firstboot (og ikke bare rå kloning)

En rå klone deler identitet med golden-Pi-en på fire nivåer, og alle gir feil som
er sure å feilsøke i felt:

1. **Xibo:** Arexibo sin `display_id` = `/etc/machine-id` (cachet i `~/xibo/cms.json`).
   To Pi-er med samme id = «samme display» i CMS → innhold/status i surr.
2. **Raspberry Pi Connect:** klonet device-state → enhetene overskriver hverandre i
   konsollen. Firstboot sletter state (uten `signout`, som ville rammet golden-enheten)
   og melder inn på nytt med org-auth-key fra `.env.local`.
3. **SSH-vertsnøkler:** deles av alle kloner → MITM-varsler og dårlig hygiene. Regenereres.
4. **Skjerm-token:** hver skjerm har sitt token mot appen (`/api/screen/power` m.m.).
   `flash-pi.sh` oppretter raden i Supabase og legger tokenet i provision-fila.

## Sikkerhet

Provision-fila (`infoskjerm-provision.json` på FAT32-boot-partisjonen) inneholder
skjerm-token, org-auth-key og ev. WiFi-passord. Firstboot **flytter** den til
`/var/lib/infoskjerm-firstboot/applied.json` (root, 600) før kiosken starter, og
sletter auth-nøkkelen fra den etter vellykket Connect-innmelding. Ikke la ferdig-
flashede kort ligge på avveie — de er nøkler til skjermen sin.

## Feilsøking

| Symptom | Sjekk |
|---------|-------|
| Pi-en beholder golden-hostnavnet | Lå `infoskjerm-provision.json` på boot-partisjonen? `journalctl -u infoskjerm-firstboot` |
| Dukker ikke opp i Connect | Fase 2 prøver igjen hver boot: `journalctl -u infoskjerm-firstboot`; sjekk nett + at `connect_auth_key` var i provision-fila |
| Vises ikke i Xibo | Nettet? `~/xibo/cms.json` skal ha `display_id` = ny `/etc/machine-id` |
| «unauthorized» i Xibo-GUI på skjermen | Normalt før adopsjon — kjør `adopt-display.mjs` |
