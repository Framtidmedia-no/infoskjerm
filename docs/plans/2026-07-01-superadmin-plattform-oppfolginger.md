# Superadmin-plattform — kjente oppfølginger etter inkrement 1

Dato: 2026-07-01. Gjelder branch `feat/superadmin-plattform`. Disse ble bevisst holdt
utenfor inkrement 1 (tenant-velger) og bør tas i senere runder.

## 1. Category C — enkelt-rad-mutasjoner uten eksplisitt tenant-guard (defense-in-depth)

Audit under Task 7b fant ~15 `.eq("id", …)`-operasjoner (update/delete/toggle) på tenant-scopede
tabeller uten `.eq("tenant_id", tenantId)`. Lav praktisk risiko: en super_admin i act-as ser kun
aktiv-tenant-id-er i UI-et, så de kan ikke lett nå fremmede id-er. Men for defense-in-depth bør
disse også scopes til effektiv tenant. Kjente steder:

- `src/app/admin/settings/actions.ts`: `sendCommand`, `regenerateToken`, `deleteScreen` (`screens.update/delete().eq("id", …)`), `updateChainBranding`, `uploadChainLogo` (`chains.update().eq("id", …)`).
- `src/app/admin/stores/actions.ts`: `updateStoreKundeklubb`, `deleteStore` (`stores.*.eq("id", …)`), `deleteUser` (`users.delete().eq("id", …)`), `toggleStoreTag`. Disse bruker fortsatt `requireUser()` (uten effektiv tenant).
- `src/app/admin/users/actions.ts`: `updateUserRole` (`users.update().eq("id", …)`).
- `src/app/admin/innhold/actions.ts`: flere `content_items` update/delete by id.

Anbefalt mønster: bytt `requireUser()` → `requireRole([...])` i disse actionsene og legg
`.eq("tenant_id", tenantId)` på mutasjonen.

## 2. Pre-eksisterende rolle-inkonsistens: `/admin/settings`

`src/app/admin/settings/page.tsx` guarder med `["super_admin","chain_manager","store_manager"]`,
men sidebaren viser «Innstillinger» også til `area_manager`
(`["super_admin","chain_manager","area_manager","store_manager"]`). En `area_manager` inviteres av
menyen, men blir redirectet vekk fra siden. Dette er **pre-eksisterende** (bekreftet identisk på
base-commit `5cfbc4b`), ikke introdusert av act-as-arbeidet. Fiks: legg `area_manager` til
guarden (eller fjern fra sidebaren hvis bevisst).

## 3. E2E må kjøres i CI / lokalt med super_admin-testkonto

`e2e/act-as.spec.ts` er skrevet mot den faktiske auth-helperen (`loginAsAdmin` i `e2e/helpers.ts`)
og selektorene er verifisert mot ekte DOM, men kunne **ikke kjøres i sandkassen**: de seedede
test-credentialene (`TEST_EMAIL`/`TEST_PASSWORD`) ble avvist av Supabase auth, og test-brukeren er
uansett ikke `super_admin`. For å validere flyten trengs:
- en Supabase-bruker med `role = 'super_admin'` i `public.users`,
- `TEST_EMAIL`/`TEST_PASSWORD` satt til den brukeren,
- fersk sesjon (ingen `sa_active_tenant`-cookie forhåndssatt),
- minst én tenant-rad så «Opptre som» har et mål.

## 4. Miljø: `web-push` ikke installert i sandkassen

`web-push` (+`@types/web-push`) er **deklarert** i `package.json`, men var ikke installert i
sandkassen, så `npx tsc --noEmit` rapporterer én urelatert `TS2307` i `src/lib/push/send.ts`, og
`next build` kan ikke fullføres her. På et fullt installert miljø (CI/lokalt) forsvinner dette.
Kjør `npm install` + `npm run build` der for å verifisere produksjonsbygget.

## 5. Neste inkrementer (fra spec §9)

2. Plattform-dashboard (cross-tenant oversikt — vil bruke de nå-scopede, i dag ubrukte
   `getAdminStats`/`getChainOverview`-helperne).
3. Tenant-livssyklus (migrasjon 028: `tenants.status`/`archived_at` + opprett/rediger/suspender/arkiver).
4. Brukere & skjermer/drift på tvers.
