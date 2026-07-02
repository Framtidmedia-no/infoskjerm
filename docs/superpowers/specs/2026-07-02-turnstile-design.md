# Cloudflare Turnstile — botbeskyttelse på offentlige skjemaer

**Dato:** 2026-07-02 · **Status:** Godkjent (autonom økt, per Franks direktiv)

## Mål

Beskytte de tre offentlige skjemaene mot bots/misbruk (credential stuffing, e-post-spam):

1. `/login` — innlogging (e-post + passord)
2. `/glemt-passord` — utløser e-postutsendelse (Resend)
3. `/pamelding/[id]` — offentlig arrangementspåmelding, kan utløse e-post

## Arkitektur

- **Ingen ny npm-avhengighet.** Cloudflare-scriptet (`challenges.cloudflare.com/turnstile/v0/api.js`) lastes eksplisitt av en liten klientkomponent.
- **`src/lib/turnstile/verify.ts`** (server-only): `verifyTurnstileToken(token)` → POST til `siteverify` med `TURNSTILE_SECRET_KEY`. Fail-closed: manglende token/secret eller ikke-success ⇒ avvist.
- **`src/components/turnstile-widget.tsx`** (klient): eksplisitt rendring, props `onToken(token | null)` + `theme`. Token er engangs — skjemaene remounter widgeten (`key={attempt}`) etter hvert innsendingsforsøk.
- **Håndheving skjer i server actions**, ikke på klienten:
  - `/login`: innlogging flyttes fra klientsidens `signInWithPassword` til ny server action `loginWithPassword` (verifiser Turnstile → `supabase.auth.signInWithPassword` via server-klient som setter cookies → audit-logg). `logLoginEvent` bakes inn i actionen.
  - `/glemt-passord`: `requestPasswordReset(email, turnstileToken)` verifiserer først; siden viser nå feil ved avvist token (før ignorerte den svaret).
  - `/pamelding/[id]`: `signupForEvent` får `turnstileToken` i input og verifiserer først.
- Submit-knappene deaktiveres til widgeten har levert token («disable until ready»); feilcallback viser melding.

## Nøkler og miljøer

| Miljø | Site key | Secret key |
|---|---|---|
| localhost (`.env.local`) | `1x00000000000000000000AA` (demo, alltid pass) | `1x0000000000000000000000000000000AA` (demo) |
| Vercel production | ekte nøkkel (Cloudflare-widget) | ekte nøkkel |
| Vercel preview/development | demo-nøkler (preview-domener er ikke registrert i widgeten) | demo |

Env-navn: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` og `TURNSTILE_SECRET_KEY`.

## Sikkerhetsnotat

Full håndheving mot direkte kall til Supabase Auth-endepunktet (utenom appens UI) krever i tillegg captcha aktivert i Supabase Dashboard (Auth → Attack Protection). Det er en Dashboard-innstilling Claude ikke kan endre — appen sender ikke `captchaToken` til Supabase i dag; slås dette på må det ettermonteres. Vår server-action-verifisering beskytter alle appens egne innganger.

## Testplan

- Bygg + tsc grønt.
- `siteverify` med ekte secret + dummy-token ⇒ `invalid-input-response` (beviser at secret er gyldig, ikke `invalid-input-secret`).
- E2E (Playwright, egen port): login-side rendrer widget, demo-nøkkel gir token, feil passord gir «Feil e-post eller passord» (Turnstile passert). Negativ flyt: dev-server med `2x…AA`-secret (alltid avslag) ⇒ innlogging blokkeres med tydelig feilmelding. Full innlogging testes med midlertidig testbruker (opprettes/slettes via service role).
- GDPR: Cloudflare legges til som underdatabehandler i behandlingsprotokollen.

## Known non-CMS

Turnstile-feilmeldinger er systemtekst (norsk, hardkodet) — kunden skal ikke redigere disse.
