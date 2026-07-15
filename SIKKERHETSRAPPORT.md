# Sikkerhetsrapport — Infoskjerm (Nordstjerne)

> **STATUS 2026-07-03 — UTBEDRET.** Funn #1 (KRITISK), #2 & #3 (HØY) og #6 (LAV)
> er fikset i DB via migrasjon `20260703154002_security_fixes_users_screens_playlog_rls.sql`
> (applisert til prod + verifisert live: anon leser nå 0 skjermer, self-escalation
> blokkert, admin/area-roller + player uendret). Funn #4 (klubb-Turnstile+lengdecap),
> #7 (pamelding-cap) og kode-delen av #5 (cron fail-closed) er i denne PR-en.
> **Gjenstår manuelt:** rotere `CRON_SECRET` til en tilfeldig verdi i Vercel + GitHub
> (krever samtidig prod-redeploy).

**Dato:** 2026-07-03 · **Auditor:** Framtid Tech (automatisert dyprevisjon) · **Stack:** Next.js 16 (App Router) + Supabase/Postgres (RLS) + Vercel + Xibo
**Prosjekt-ref (Supabase):** `fcxwrfmdvfjulhoebceq` (gange-rolv-infoskjerm) — verifisert mot `.env`/`config.ts` før DB-spørringer.

Alle funn under er **empirisk verifisert** mot koden og mot prod-databasens faktiske policyer/grants (ikke bare migrasjonsfilene). Teoretiske «best practice»-punkter uten konkret angrepsvei er utelatt.

---

## Funntabell (sortert: Kritisk → Høy → Medium → Lav)

| # | Alvorlighet | Fil:linje | Sårbarhet | Angrepsvei | Fix |
|---|-------------|-----------|-----------|------------|-----|
| 1 | **KRITISK** | `supabase/migrations/001_initial_schema.sql:184` (policy `tenant_isolation` på `users`) | **Vertikal privilegie-eskalering.** RLS-policyen på `users` er `FOR ALL USING (tenant_id = get_my_tenant_id())` uten `WITH CHECK` og uten kolonne-/rollevern. `authenticated` har UPDATE-grant, og det finnes **0 triggere** på tabellen. | Hvilken som helst innlogget bruker (f.eks. `store_manager`) kaller PostgREST direkte med sin egen JWT: `PATCH /rest/v1/users?id=eq.<egen_id>` med `{"role":"super_admin"}`. Tenant er uendret → USING-uttrykket (som også brukes som CHECK når WITH CHECK mangler) passerer. Bruker blir super_admin → full tilgang til **alle** tenants via act-as. App-guarden `requireRole` beskytter kun UI, ikke direkte API-kall. | Trigger som blokkerer `role`/`tenant_id`/`chain_id`-endring for ikke-admins, ELLER splitt policyen (SELECT for tenant, skriv kun for chain_manager/super_admin). Patch under. |
| 2 | **HØY** | `supabase/migrations/001_initial_schema.sql:187` (policy `screen_token_read` på `screens`) | **Kryss-tenant datalekkasje via anon-nøkkel.** `screen_token_read` er `FOR SELECT USING (true)` mot rollen `public` (inkl. `anon`), og `anon` har SELECT-grant. | Verifisert live: med den offentlige anon-nøkkelen (ligger i hver nettleser) returnerer `GET /rest/v1/screens?select=id,name,token,tenant_id,store_id` **alle** skjermrader på tvers av **alle** tenants — inkl. hemmelige `sk_…`-tokens, navn og tenant/store-IDer. Tokenet er kapabiliteten til `/skjerm/<token>` og `/api/screen/power` (POST kan spoofe TV-status/heartbeat på en hvilken som helst skjerm). | Erstatt `USING (true)` med token-scopet lesing (som `play_log`), eller dropp policyen (skjerm-/widget-sidene leser via service-role og trenger den ikke). Patch under. |
| 3 | **HØY** | `src/app/admin/skjermer/actions.ts:49,175,207,233,277,297,314` + `001_initial_schema.sql:174` | **Horisontal privilegie-eskalering innen tenant.** `screens`-RLS er kun tenant-scopet (`tenant_isolation`), aldri strammet til per-butikk slik `stores`/`content_items` er (`user_can_access_store`). Alle skjerm-actionene gjør id-only mutering (`.update/.delete().eq("id", screenId)`) uten butikk-sjekk. | En `area_manager` som kun er tildelt Butikk A kan slette, omdøpe, endre visning på og slå av/på (`overrideScreenPower('off')`) skjermer i søsken-Butikk B i **samme tenant** — via appen eller direkte PostgREST. `assignDisplay`/`addKiosk` lar dem også opprette skjermrader knyttet til fremmed `store_id`. | Stram `screens`-RLS til per-butikk (`user_can_access_store(store_id)` for ikke-admins). Patch under. |
| 4 | Medium | `src/app/klubb/[store]/actions.ts:10-37` | **Uautentisert skrive-endepunkt uten bot-/lengdevern.** `joinKundeklubb` mangler Turnstile (til forskjell fra `signupForEvent`), lengdevalidering og rate limiting. | Angriper flommer server-action med innmeldinger med multi-MB-felter → spam/lagringsvekst i `kundeklubb_members`. Ikke kryss-tenant (store/tenant avledes server-side), så begrenset til støy per butikk. | Legg til `TurnstileWidget` + `verifyTurnstileToken` (kopier `signupForEvent`), cap felt-lengder, vurder rate limiting. |
| 5 | Medium | `src/app/api/cron/*/route.ts:18` + `.env.local:3` | **Svak, gjettbar cron-hemmelighet + fail-open-mønster.** Vakten er `if (process.env.CRON_SECRET && auth !== …)` — mangler variabelen, er endepunktet **helt åpent**. Verdien i repoets `.env.local` er `infoskjerm-cron-2026` (gjettbar). | Kjenner/gjetter en angriper hemmeligheten (eller hvis den er usatt i prod), kan de spamme `sync-kundeavis` (ekstern fetch + PDF-rasterisering = CPU/kost), `notify-offers` (push-spam til admins), `reconcile-offers` (Xibo-API-last). | Roter til tilfeldig 32+ tegns verdi (`openssl rand -hex 32`) i Vercel + GitHub Secrets. Fjern `process.env.CRON_SECRET &&`-guarden (fail-closed). |
| 6 | Lav | `supabase/migrations/012_play_log.sql:20` | **Kryss-tenant INSERT på analytikk.** INSERT-policyen har grenen `OR auth.role() = 'authenticated'`, så enhver innlogget bruker kan sette inn `play_log`-rader med vilkårlig `tenant_id`/`screen_id`. | Innlogget bruker i tenant A forurenser avspillingsstatistikken til tenant B (skrive-only; SELECT er korrekt tenant-scopet). Kun statistikk-integritet, ingen PII. | Fjern `OR auth.role() = 'authenticated'`, eller erstatt med `tenant_id = get_my_tenant_id()`. |
| 7 | Lav | `src/app/pamelding/[id]/actions.ts:32,66-69` | **Manglende lengdegrense på fri-tekstfelt.** `name`/`comment`/`dietary` trimmes men cappes ikke (Turnstile finnes, så bot-vern er OK). | Innsending med svært store strenger lagres i `event_signups`. Lav — bak captcha. | Cap felt-lengder (f.eks. `name.slice(0,120)`, `comment.slice(0,1000)`). |

---

## Verifiseringsmetode (kort)

- **DB-fakta hentet live** fra `pg_policies`, `information_schema.role_table_grants`, `pg_trigger`, `pg_proc` mot prod-ref `fcxwrfmdvfjulhoebceq` (read-only).
- **Funn #2 bevist** med et faktisk anon-kall mot `/rest/v1/screens` — returnerte tokens for begge tenants (`58b9ce22…` Mobile Oslo + `00000000-…-001` EUROSPAR MOA).
- **Funn #1 bevist** ved kjede: policy uten WITH CHECK/rollevern + `authenticated` har UPDATE-grant + 0 beskyttende triggere + `get_my_tenant_id()` returnerer egen tenant (uendret ved role-bytte). Den destruktive UPDATE-en ble **ikke** utført mot prod.

## Verifisert TRYGT (ingen handling)

- **XSS:** 0 treff på React-HTML-injeksjons-sinks (rå HTML-innsetting eller dynamisk kode-evaluering). TipTap-HTML rendres aldri rått — går gjennom `htmlToBlocks()`/`stripTags` og skrives som auto-escapet React-children.
- **Secrets/git:** ingen `service_role`-nøkkel eller andre hemmeligheter i git-historikken (kun den offentlige anon-nøkkelen, som er ment å committes). `.env*` er gitignored.
- **IDOR (admin-ruter):** alle `[id]`/`[store]`-ruter bruker enten RLS-klient + `.eq("tenant_id", …)` eller service-role med eksplisitt `canAccessInvitation`/`user_stores`-scoping. PII-tabeller (`kundeklubb_members`, `event_signups`, `audit_log`) har RLS med 0 policyer = fail-closed.
- **SSRF:** `kundeavis-pdf` og `spar-actions` har host-allowlist + https + `.pdf`-krav.
- **Auth:** `login`/`glemt-passord` har Turnstile + generiske feilmeldinger (ingen brukerenumerering). `auth/callback` origin-prefikser redirect (ingen open redirect). SECURITY DEFINER-helpere har `SET search_path`.
- **npm audit:** rent på high+ (kun 2 moderate, byggetids-`postcss` i Next — ikke runtime-utnyttbart).
- **Skjermbilde-proxy** (`cms/skjermbilde/[displayId]`): korrekt `requireRole` + display-tilgangssjekk (tidligere IDOR, nå tettet).

---

## Konkrete patcher (KRITISK + HØY) — IKKE applisert, avventer godkjenning

### Funn #1 — `users` self-escalation (KRITISK)

Ny migrasjon `supabase/migrations/20260703HHMMSS_users_block_self_privilege_escalation.sql`:

```sql
-- Blokkér at ikke-admins endrer egen rolle/tenant/chain via direkte PostgREST-kall.
-- RLS-policyen på users er FOR ALL uten WITH CHECK, så en bruker kan i dag PATCHe
-- sin egen rad til role='super_admin'. Vi legger en BEFORE UPDATE-trigger som kun
-- lar chain_manager/super_admin røre disse kolonnene.

create or replace function public.prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  -- Admins (og service-role som bypasser RLS/trigger) får styre roller/tenancy.
  if get_my_role() in ('super_admin', 'chain_manager') then
    return new;
  end if;
  if new.role      is distinct from old.role
     or new.tenant_id is distinct from old.tenant_id
     or new.chain_id  is distinct from old.chain_id then
    raise exception 'Ikke tillatt å endre rolle/tenant/chain';
  end if;
  return new;
end;
$$;

drop trigger if exists users_no_self_escalation on public.users;
create trigger users_no_self_escalation
  before update on public.users
  for each row execute function public.prevent_self_privilege_escalation();
```

> Merk: service-role (server-side `createAdminClient`) bypasser RLS, men **ikke** triggere — bekreft at ingen legitim service-role-flyt endrer disse kolonnene for en vanlig bruker (invite/act-as går via super_admin-kontekst, som slippes gjennom). Alternativ: splitt `tenant_isolation` i egen SELECT-policy + skrive-policy gated på `get_my_role() = 'chain_manager'`.

### Funn #2 — `screens` anon-lesing (HØY)

```sql
-- screen_token_read = USING(true) lekker ALLE skjermtokens til anon. Skjerm-/widget-
-- sidene leser via service-role (bypasser RLS), så policyen er ren angrepsflate.
-- Scope til request-tokenet (samme mønster som play_log) i stedet for å droppe helt,
-- slik at ev. token-basert PostgREST-lesing fortsatt fungerer.

drop policy if exists screen_token_read on public.screens;

create policy screen_token_read on public.screens
  for select
  using (
    token = (current_setting('request.jwt.claims', true)::json ->> 'token')
  );
```

> Om ingen klient leser `screens` via anon+token (verifiser: skjermsidene bruker `createAdminClient`), er det tryggere å **droppe** policyen helt.

### Funn #3 — `screens` per-butikk-RLS (HØY)

```sql
-- Stram tenant-only-policyen til per-butikk, likt stores/content_items.
drop policy if exists tenant_isolation on public.screens;

create policy screens_store_access on public.screens
  for all
  using (
    tenant_id = get_my_tenant_id()
    and (is_all_store_admin() or store_id is null or user_can_access_store(store_id))
  )
  with check (
    tenant_id = get_my_tenant_id()
    and (is_all_store_admin() or store_id is null or user_can_access_store(store_id))
  );
```

> `store_id is null` beholder tilgang til ubundne kiosk-rader for tenant-admins. Verifiser at `area_manager`-flyten fortsatt kan styre egne butikkers skjermer etterpå.

---

## Oppsummering (3 linjer)

1. **Total risiko: HØY.** Kjerne-forsvaret (server actions, XSS, IDOR i app-lag, PII-tabeller) er solid, men to RLS-hull i `users` og `screens` undergraver hele multi-tenant-modellen på DB-nivå der PostgREST er direkte eksponert.
2. **Viktigste funn:** en hvilken som helst innlogget bruker kan PATCHe sin egen `users`-rad til `super_admin` (Funn #1, KRITISK) → full kontroll over alle tenants; og anon-nøkkelen lekker alle skjermtokens på tvers av tenants (Funn #2, HØY).
3. **Anbefalt neste steg:** applisér patch #1 umiddelbart (én trigger, lav risiko), deretter #2 og #3 i samme migrasjonsrunde; roter cron-hemmeligheten og legg bot-vern på kundeklubb-innmelding. Re-verifiser med et anon-kall mot `/rest/v1/screens` (skal gi 0 rader) og et forsøk på self-role-PATCH (skal feile).
