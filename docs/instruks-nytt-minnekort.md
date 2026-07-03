# 📇 Instruks: Klargjøre minnekort til ny butikk-Pi (for Frank)

Slik lager du et ferdig SD-kort til en ny skjerm — **uten** å laste ned image,
uten Raspberry Pi Imager, uten manuelt oppsett. Alt kjøres fra Terminal i
`~/Documents/GitHub/infoskjerm` (repo-rot).

**Du trenger:** Mac-en med repoet · SD-kortleser · blankt kort (≥ golden-kortets
størrelse, dvs. samme type kort som flåten bruker) · navnet på butikken slik det
står i admin.

---

## Vanlig bruk: flash et nytt kort

**1. Sett det blanke kortet i kortleseren.**

**2. Kjør flash-kommandoen** — bytt ut hostnavn og butikknavn:

```bash
./scripts/pi/goldenimage/flash-pi.sh gr-spar-butikk1 --butikk "SPAR Butikk"
```

- Hostnavn-regel: `gr-<butikk><nr>` — `…1` = kundeskjerm (portrett), `…2` = bakrom (liggende)
- Butikknavn = slik butikken heter i admin (delvis match holder: `--butikk "MOA"`)
- Skal Pi-en rett på butikkens WiFi, legg til: `--wifi-ssid kundenett --wifi-pass 'passordet'`

**3. Svar på det scriptet spør om:**
- Den viser hvilken disk den fant → **skriv disknavnet** (f.eks. `disk4`) for å bekrefte. Alt på kortet slettes!
- Tast **sudo-passordet ditt** når den ber om det.
- Vent 10–40 min mens imaget skrives. Kortet mates ut automatisk når det er ferdig.

**4. Sett kortet i Pi-en og gi strøm.** Den booter **to ganger** helt av seg selv
(først identitet, så innmelding i Connect) — ikke skru av selv om skjermen
blinker litt. Etter noen minutter er den synlig i Connect-konsollen og i admin.

**5. Autoriser skjermen i Xibo** (én kommando, eller be Claude gjøre det):

```bash
node scripts/xibo/adopt-display.mjs gr-spar-butikk1 --group "SPAR Butikk"
```

**6. Ute i butikken:** koble til TV-en, sjekk at **CEC er PÅ i TV-menyen**
(Samsung: Anynet+ · LG: SimpLink · Sony: Bravia Sync), og test «Slå av nå /
Slå på nå» fra skjermkortet i admin.

**7. Be Claude oppdatere flåteregisteret** (`docs/raspberry-enheter.md`) — eller
før inn raden selv.

> 💡 Skjermraden i admin/Supabase opprettes automatisk av flash-scriptet med
> riktig token. Finnes den fra før (re-flash av samme skjerm), gjenbrukes den —
> trygt å kjøre om igjen.

---

## Sjekkliste når den nye Pi-en har bootet

- [ ] Synlig som **Online** i Connect-konsolen (connect.raspberrypi.com, Framtid Tech AS)
- [ ] Skjermkortet i admin viser heartbeat/TV-badge (innen ~2 min)
- [ ] `adopt-display.mjs` kjørt → skjermen viser innhold (ikke «unauthorized»)
- [ ] Rad oppdatert i `docs/raspberry-enheter.md`

---

## Sjeldnere: lage NYTT golden image

Gjøres bare når grunnoppsettet på Pi-ene er vesentlig endret (ny agent, nye
pakker, endret kiosk-oppsett) — be gjerne Claude om hjelp:

```bash
# 1. Claude installerer/oppdaterer firstboot på en ferdig Pi og slår den av:
#    (krever at Mac-en er på samme nett som Pi-en)
scp -r scripts/pi/goldenimage frlund3@<pi-ip>:/tmp/goldenimage
ssh frlund3@<pi-ip> "sudo HALT=1 bash /tmp/goldenimage/prepare-golden.sh"

# 2. Trekk kortet fra Pi-en, sett i Mac-en, og kjør:
./scripts/pi/goldenimage/capture-golden-image.sh
#    (bekreft disknavn + sudo-passord — tar 10–40 min)

# 3. Sett kortet TILBAKE i Pi-en og gi strøm. Ferdig.
```

Nye flashinger bruker automatisk det nyeste `~/infoskjerm-golden-*.img.gz`.
Gamle image-filer kan slettes når et nytt er verifisert.

---

## Hvis noe går galt

| Problem | Løsning |
|---------|---------|
| «Fant flere eksterne disker» | Ta ut andre USB-disker, eller oppgi `--disk diskN` (se `diskutil list external`) |
| «Fant 0/2 butikker som matcher» | Sjekk stavemåten mot admin → Butikker; bruk et mer unikt utsnitt av navnet |
| Pi-en beholder gammelt navn etter boot | Kortet fikk ikke provision-fil — flash på nytt, eller spør Claude (`journalctl -u infoskjerm-firstboot` på Pi-en) |
| Ikke synlig i Connect etter 10 min | Den prøver igjen hver boot — sjekk nett-tilgang; ellers spør Claude |
| Skjermen viser «Display is not authorised» | Kjør steg 5 (adopt-display) |
