# Lag en råflott infoskjerm-side med AI

Denne funksjonen lar deg lage en levende, animert side til infoskjermene dine — helt uten å kunne kode. Du ber Claude (eller ChatGPT) om å lage en ferdig HTML-fil, laster den ned, og laster den opp i admin. Ferdig.

## Den ene regelen du må huske

Skjermene våre viser siden i en **låst boks uten JavaScript og uten internett**. Det betyr to ting:

1. **All bevegelse må være ren CSS.** «Levende» = CSS-animasjon (ting som toner inn, glir, pulserer sakte). JavaScript kjører ikke — be aldri om det.
2. **Du trenger to filer — én per skjermretning.** Noen skjermer henger på tvers (liggende), andre står på høykant (stående). Samme budskap, to filer.

Alt annet er detaljer. Startprompten lenger nede tar seg av dem for deg — du fyller bare inn hva siden skal si.

---

## Slik gjør du det

1. **Åpne Claude** (claude.ai) eller ChatGPT. Start en ny samtale.
2. **Lim inn STARTPROMPTEN** fra seksjonen under.
3. **Fyll inn plassholderne** i prompten: butikknavn, budskap, farger. Bytt ut alt som står i `[HAKEPARENTES]`.
4. **Be om begge retninger.** Prompten gjør allerede dette, men dobbeltsjekk at du får to filer: én liggende (1920 × 1080) og én stående (1080 × 1920).
5. **Last ned de to `.html`-filene.** Claude gir deg filene eller koden — lagre hver som en `.html`-fil på maskinen (f.eks. `tilbud-liggende.html` og `tilbud-staaende.html`).
6. **Gå til admin** og opprett nytt innhold av typen som tar HTML-side.
   - Legg den liggende filen i **Liggende**-feltet.
   - Legg den stående filen i **Stående**-feltet.
7. **Forhåndsvis.** Sjekk at teksten er stor nok og at ingenting er kuttet i kantene. Se på begge retninger.
8. **Publiser** til butikken/skjermen din.

> Tips: Er du usikker på om siden ser bra ut? Dobbeltklikk `.html`-filen på din egen maskin — den åpner seg i nettleseren akkurat slik skjermen vil vise den.

---

## STARTPROMPT (kopier og lim inn)

Bytt ut alt i `[HAKEPARENTES]` med ditt eget. La resten stå.

```
Du skal lage innhold til en digital infoskjerm (digital signage). Jeg er ikke
utvikler, så gi meg ferdige, komplette filer jeg bare kan laste ned og bruke.

LAG TO SEPARATE HTML-FILER:
  FIL 1 — LIGGENDE: designflate nøyaktig 1920 × 1080 piksler (16:9, på tvers).
  FIL 2 — STÅENDE:  designflate nøyaktig 1080 × 1920 piksler (9:16, på høykant).
Samme budskap og samme stil i begge, men komponer layouten på nytt så den
passer hver retning (ikke bare strekk den ene).

INNHOLD:
- Butikk/avsender: [BUTIKK]
- Hovedbudskap (det ENE folk skal lese på avstand): [BUDSKAP]
- Støttetekst / detaljer (valgfritt): [DETALJER]
- Ev. pris eller nøkkeltall som skal være stort: [PRIS]
- Farger / merkevare: [FARGER]  (f.eks. «mørk bakgrunn, gull aksent» eller HEX-koder)
- Stemning/stil: [STIL]  (f.eks. elegant, leken, minimalistisk, premium)

HARDE TEKNISKE KRAV — MÅ følges nøyaktig, ellers virker det ikke hos oss:

1. ÉN selvstendig .html-fil per retning. ALT skal ligge inne i filen:
   - CSS i en <style>-blokk i samme fil.
   - Ev. bilder/logo lagt inn som data:-URI (base64) direkte i HTML/CSS.
   - INGEN <link> til eksterne stilark. INGEN Google Fonts eller andre CDN-fonter.
     INGEN eksterne bilder, ikoner eller ressurser. INGENTING som lastes fra nettet.
     Bruk kun web-trygge systemfonter (f.eks. Arial, Helvetica, Georgia,
     "Times New Roman", system-ui).

2. INGEN JavaScript. Siden vises i en låst sandkasse der JS ikke kjører.
   ALL bevegelse skal være ren CSS: @keyframes, animation, transition, transform.
   Animasjonene skal loope sømløst i det uendelige (spilles for alltid), være
   rolige og subtile — ingen harde blink, ingen stroboskop-effekt.

3. Fyll HELE flaten. <body> uten marg/scrollbar. Bruk en scene som er nøyaktig
   1920×1080 (liggende) / 1080×1920 (stående) — f.eks. width/height 100vw/100vh
   eller faste piksler — og overflow: hidden. Ingen hvite kanter.

4. STOR, LESBAR typografi. Skjermen ses fra flere meter unna. Hovedbudskapet skal
   dominere (tenk enormt). Sterk kontrast mellom tekst og bakgrunn. Tydelig
   hierarki: ett dominerende element, resten underordnet.

5. TRYGG MARG: hold all viktig tekst og logo minst 6–8 % inn fra hver kant.
   TV-er kan beskjære (overscan) ytterkantene, så ingenting viktig helt ut i kanten.

6. Filstørrelse under ca. 1,5 MB per fil. Bruk helst CSS-gradienter i stedet for
   fotobakgrunner. Hvis du MÅ ha et foto, komprimer det hardt før du legger det
   inn som data:-URI.

LEVER RESULTATET SLIK:
- Gi meg hver fil som én komplett kodeblokk jeg kan kopiere rått, klart merket
  «LIGGENDE (1920×1080)» og «STÅENDE (1080×1920)».
- Start hver fil med <!doctype html> og inkluder alt (html, head, style, body).
- Ikke forklar koden linje for linje — bare lever de to ferdige filene.
- Etterpå: skriv én setning per fil om hva jeg skal kalle den (filnavn).

Lag noe råflott og profesjonelt — dette skal se dyrt og gjennomtenkt ut, ikke
som en standard mal.
```

---

## Eksempel — ferdig utfylt prompt

Slik ser det ut når plassholderne er byttet ut med et ekte tilfelle: ukens tilbud i en Eurospar-butikk.

```
Du skal lage innhold til en digital infoskjerm (digital signage). Jeg er ikke
utvikler, så gi meg ferdige, komplette filer jeg bare kan laste ned og bruke.

LAG TO SEPARATE HTML-FILER:
  FIL 1 — LIGGENDE: designflate nøyaktig 1920 × 1080 piksler (16:9, på tvers).
  FIL 2 — STÅENDE:  designflate nøyaktig 1080 × 1920 piksler (9:16, på høykant).
Samme budskap og samme stil i begge, men komponer layouten på nytt så den
passer hver retning (ikke bare strekk den ene).

INNHOLD:
- Butikk/avsender: Eurospar Moa
- Hovedbudskap (det ENE folk skal lese på avstand): Ukens tilbud
- Støttetekst / detaljer (valgfritt): Grandiosa Original, frossen pizza
- Ev. pris eller nøkkeltall som skal være stort: 3 for 99,-
- Farger / merkevare: mørk bakgrunn (nesten sort, dyp grønn undertone),
  varm gull/champagne aksentfarge, ren hvit tekst
- Stemning/stil: premium og appetittvekkende, elegant, rolig

HARDE TEKNISKE KRAV — MÅ følges nøyaktig, ellers virker det ikke hos oss:

1. ÉN selvstendig .html-fil per retning. ALT skal ligge inne i filen:
   - CSS i en <style>-blokk i samme fil.
   - Ev. bilder/logo lagt inn som data:-URI (base64) direkte i HTML/CSS.
   - INGEN <link> til eksterne stilark. INGEN Google Fonts eller andre CDN-fonter.
     INGEN eksterne bilder, ikoner eller ressurser. INGENTING som lastes fra nettet.
     Bruk kun web-trygge systemfonter (f.eks. Arial, Helvetica, Georgia,
     "Times New Roman", system-ui).

2. INGEN JavaScript. Siden vises i en låst sandkasse der JS ikke kjører.
   ALL bevegelse skal være ren CSS: @keyframes, animation, transition, transform.
   Animasjonene skal loope sømløst i det uendelige (spilles for alltid), være
   rolige og subtile — ingen harde blink, ingen stroboskop-effekt.
   La for eksempel prisen «3 for 99,-» pulsere svakt, og la en myk lysglød
   gli sakte over flaten.

3. Fyll HELE flaten. <body> uten marg/scrollbar. Bruk en scene som er nøyaktig
   1920×1080 (liggende) / 1080×1920 (stående) — f.eks. width/height 100vw/100vh
   eller faste piksler — og overflow: hidden. Ingen hvite kanter.

4. STOR, LESBAR typografi. Skjermen ses fra flere meter unna. «3 for 99,-» skal
   dominere (tenk enormt). Sterk kontrast: hvit/gull tekst på mørk bunn. Tydelig
   hierarki: prisen størst, «Ukens tilbud» over, produktnavnet under.

5. TRYGG MARG: hold all viktig tekst minst 6–8 % inn fra hver kant.
   TV-er kan beskjære (overscan) ytterkantene.

6. Filstørrelse under ca. 1,5 MB per fil. Bruk CSS-gradienter i stedet for foto
   til bakgrunnen.

LEVER RESULTATET SLIK:
- Gi meg hver fil som én komplett kodeblokk jeg kan kopiere rått, klart merket
  «LIGGENDE (1920×1080)» og «STÅENDE (1080×1920)».
- Start hver fil med <!doctype html> og inkluder alt.
- Ikke forklar koden linje for linje — bare lever de to ferdige filene.
- Etterpå: skriv én setning per fil om hva jeg skal kalle den (filnavn).

Lag noe råflott og profesjonelt — dette skal se dyrt og gjennomtenkt ut.
```

Får du noe du ikke er fornøyd med? Bare svar Claude videre i samme samtale: «Gjør prisen enda større», «prøv en lysere bakgrunn», «roligere animasjon». Den bygger om filene for deg.

---

## Tips for et proft resultat

- **Ett budskap per side.** Én ting folk skal huske. Vil du si tre ting, lag tre sider.
- **Stor tekst, sterk kontrast.** Hvis du må myse på din egen skjerm, er den for liten for TV-en på avstand.
- **Rolig bevegelse.** Subtilt slår alltid hektisk. Sakte inntoning og myk puls ser dyrt ut; blink og fart ser billig ut (og er slitsomt å se på hele dagen).
- **Test begge retninger.** Åpne begge filene i nettleseren og se at både den liggende og den stående ser ferdig ut — ikke bare strukket.
- **Sjekk kantene.** Sørg for at pris, logo og tekst har god luft inn fra kanten, så ingenting kuttes på TV-en.
- **Hold filen lett.** Under ~1,5 MB. Be om CSS-gradienter fremfor fotobakgrunn — det ser ofte mer stilrent ut uansett, og laster raskere.
- **Bruk merkevaren.** Har butikken faste farger eller en logo, oppgi dem. Logoen kan legges inn direkte i filen (som data:-URI).

---

## Hva som IKKE fungerer

Skjermene kjører siden i en låst boks uten internett. Alt under blir enten fjernet, tomt eller virker rett og slett ikke — be aldri om det:

- **JavaScript** — kjører ikke i det hele tatt. All bevegelse må være CSS.
- **Eksterne bilder** — bilder hentet fra en nettadresse (`https://...`) blir bare tomme. Bilder må ligge inne i filen som data:-URI.
- **Eksterne fonter** — Google Fonts og andre CDN-fonter lastes ikke. Bruk systemfonter.
- **Eksterne stilark og skript** — `<link>` og `<script src="...">` mot nettet gjør ingenting.
- **Videoer fra nettet** (YouTube, Vimeo, `<video src="https://...">`) — spilles ikke av.
- **Skjemaer, knapper og innlogging** — ingen kan trykke; skjermen er ikke interaktiv.
- **Alt som prøver å «hente noe fra internett»** mens siden vises — det finnes ingen nettverkstilgang i boksen.

Kort sagt: **én fil, alt inni, ingen internett, ingen JavaScript.** Følger du det (og startprompten gjør det for deg), får du en side som ser levende og råflott ut på skjermen.
