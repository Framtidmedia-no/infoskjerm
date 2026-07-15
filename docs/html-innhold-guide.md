# Lag en råflott infoskjerm-side med AI

Denne funksjonen lar deg lage en levende, animert side til infoskjermene dine — helt uten å kunne kode. Du ber Claude (eller ChatGPT) om å lage en ferdig HTML-fil, laster den ned, og laster den opp i admin. Ferdig.

## Den ene regelen du må huske

Alt skal ligge i **én selvstendig fil** — ingenting hentes fra internett mens siden vises. Det betyr to ting:

1. **Alt inni fila.** CSS, eventuell JavaScript, bilder og logo legges inn *i* HTML-fila (bilder som `data:`-URI). Ingen lenker til Google Fonts, CDN-er eller eksterne bilder. Da spiller siden videre selv om skjermen mister nettet.
2. **Du trenger to filer — én per skjermretning.** Noen skjermer henger på tvers (liggende), andre står på høykant (stående). Samme budskap, to filer.

Både **CSS-animasjon og JavaScript kjører** på skjermen — så du kan lage akkurat den bevegelsen du vil. (Koden kjøres i en låst sandkasse: den kan animere og gjøre hva den vil *inni sin egen boks*, men aldri røre systemet, andre butikker eller kundedata.)

---

## Slik gjør du det

1. **Åpne Claude** (claude.ai) eller ChatGPT. Start en ny samtale.
2. **Lim inn STARTPROMPTEN** fra seksjonen under.
3. **Fyll inn plassholderne** — butikknavn, budskap, farger. Bytt ut alt som står i `[HAKEPARENTES]`.
4. **Be om begge retninger** — én liggende (1920 × 1080) og én stående (1080 × 1920).
5. **Last ned de to `.html`-filene.** Lagre hver som en `.html`-fil (f.eks. `tilbud-liggende.html` og `tilbud-staaende.html`).
6. **Gå til admin** → nytt innhold → **HTML-side**. Legg den liggende fila i **Liggende**-feltet og den stående i **Stående**-feltet.
7. **Forhåndsvis.** Du ser siden animere direkte i feltene. Sjekk at teksten er stor nok og at ingenting kuttes i kantene.
8. **Publiser** til butikken/skjermen din.

> Tips: Dobbeltklikk `.html`-fila på din egen maskin — den åpner seg i nettleseren akkurat slik skjermen vil vise den.

---

## STARTPROMPT (kopier og lim inn)

Bytt ut alt i `[HAKEPARENTES]` med ditt eget. La resten stå.

```
Du skal lage innhold til en digital infoskjerm (digital signage). Jeg er ikke
utvikler, så gi meg ferdige, komplette filer jeg bare kan laste ned og bruke.

LAG TO SEPARATE HTML-FILER:
  FIL 1 — LIGGENDE: designflate nøyaktig 1920 × 1080 piksler (16:9, på tvers).
  FIL 2 — STÅENDE:  designflate nøyaktig 1080 × 1920 piksler (9:16, på høykant).
Samme budskap og stil i begge, men komponer layouten på nytt så den passer hver
retning (ikke bare strekk den ene).

INNHOLD:
- Butikk/avsender: [BUTIKK]
- Hovedbudskap (det ENE folk skal lese på avstand): [BUDSKAP]
- Ev. pris eller nøkkeltall som skal være stort: [PRIS]
- Farger / merkevare: [FARGER]  (f.eks. «mørk bakgrunn, gull aksent»)
- Stemning/stil: [STIL]  (f.eks. elegant, leken, minimalistisk, premium)

HARDE TEKNISKE KRAV — MÅ følges nøyaktig:
1. ÉN selvstendig .html-fil per retning. ALT inne i fila: CSS i <style>, ev. JS i
   <script>, bilder/logo som data:-URI (base64). INGEN <link>, INGEN Google
   Fonts/CDN, INGEN eksterne bilder eller kall ut på nettet — alt inline. (Da
   spiller siden videre selv om skjermen mister nettet.) Web-trygge systemfonter.
2. Bevegelse: CSS (@keyframes/transition/transform) ELLER JavaScript — begge
   kjører. La animasjonen loope rolig og sømløst; ingen harde blink/stroboskop.
3. Fyll HELE flaten. <body> uten marg/scrollbar, overflow: hidden, ingen hvite kanter.
4. STOR, lesbar typografi (ses på flere meters avstand). Sterk kontrast. Ett
   dominerende budskap.
5. TRYGG MARG: hold viktig tekst/logo minst 6–8 % inn fra hver kant (TV-er kan beskjære).
6. Under ca. 4 MB per fil.

LEVER: hver fil som én komplett kodeblokk (start med <!doctype html>), tydelig
merket «LIGGENDE (1920×1080)» og «STÅENDE (1080×1920)». Lag noe råflott og
profesjonelt — dette skal se dyrt og gjennomtenkt ut, ikke som en standard mal.
```

---

## Eksempel — ferdig utfylt

Ukens tilbud i en Eurospar-butikk. Bare bytt ut INNHOLD-delen; resten står likt:

```
INNHOLD:
- Butikk/avsender: Eurospar Moa
- Hovedbudskap: Ukens tilbud — Grandiosa Original
- Ev. pris eller nøkkeltall som skal være stort: 3 for 99,-
- Farger / merkevare: mørk bakgrunn (nesten sort, dyp grønn undertone),
  varm gull/champagne aksent, ren hvit tekst
- Stemning/stil: premium og appetittvekkende, elegant, rolig.
  La prisen «3 for 99,-» pulsere svakt, og la en myk lysglød gli sakte over flaten.
```

Får du noe du ikke er fornøyd med? Svar Claude videre i samme samtale: «Gjør prisen større», «prøv en lysere bakgrunn», «roligere animasjon». Den bygger om filene for deg.

---

## Tips for et proft resultat

- **Ett budskap per side.** Én ting folk skal huske. Vil du si tre ting, lag tre sider.
- **Stor tekst, sterk kontrast.** Må du myse på din egen skjerm, er den for liten på avstand.
- **Rolig bevegelse.** Subtilt slår hektisk. Sakte inntoning og myk puls ser dyrt ut; blink og fart ser billig ut.
- **Test begge retninger.** Se at både den liggende og den stående ser ferdig ut — ikke bare strukket.
- **Hold alt i én fil.** Be uttrykkelig om at bilder og fonter legges *inn* i fila. Da virker den offline, og du slipper løse filer.

---

## Hva som IKKE fungerer

Siden kjører i en låst boks uten tilgang til systemet vårt. Dette virker ikke — be aldri om det:

- **Filer som henter noe fra internett mens de vises** — eksterne bilder (`https://…`), Google Fonts, CDN-skript, data-henting. De laster ikke (og brekker helt om skjermen er offline). Alt må ligge *inni* fila.
- **Eksporter i flere filer.** Noen verktøy (Framer, nettsidebyggere) gir deg en `index.html` **pluss** en mappe med JS/CSS/bilder. Det kan du ikke laste opp — du trenger **én enkelt, selvstendig fil**. Be AI-en om nettopp det.
- **Skjemaer og innlogging** — ingen kan trykke; skjermen er ikke interaktiv.
- **Tilgang til systemet vårt** — koden er isolert og kan ikke nå andre butikker, kundedata eller innlogginger (og det er bra).

Kort sagt: **én fil, alt inni, ingen løse filer.** Følger du det (og startprompten gjør det for deg), får du en side som ser levende og råflott ut på skjermen — med CSS eller JavaScript, som du vil.
