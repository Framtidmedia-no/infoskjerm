@AGENTS.md

## Secrets — Doppler (fra 16. juli 2026)

Framtid Tech AS bruker **Doppler** som eneste kilde til sannhet for secrets (Doppler-project: `infoskjerm`).

- **Ny/endret secret:** `doppler secrets set NAVN --project infoskjerm --config <dev|prd>` — syncer automatisk til Vercel/GitHub. ALDRI skriv secrets direkte i Vercel/GitHub.
- **Lokal utvikling:** `doppler run -- pnpm dev`. `.env.local` er utfaset.
- **Env-endringer i prod krever redeploy** for å tre i kraft (Vercel leser env ved deploy).
- **Prod-runtime er aldri avhengig av Doppler** — Vercel/GitHub har synkede kopier.
- Detaljer: skill `doppler-framtidtech` (global Claude-skill).
