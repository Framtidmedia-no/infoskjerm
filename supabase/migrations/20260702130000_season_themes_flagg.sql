-- Sesongatmosfære («Levende skjerm») på skjermflatene: jul-snøfall, 17. mai-
-- konfetti og sommertone i bakgrunnsgløden. Gates per tenant via features-
-- flagget `seasonThemes` (se src/lib/tenant/features.ts). Slås på for
-- Gange-Rolv; andre tenants opt-er inn senere. Idempotent (jsonb-merge).
--
-- Merk: repo-migrasjoner er frakoblet prod (Branching driver ikke prod), så
-- denne kjøres også direkte mot prod-prosjektet (gange-rolv-infoskjerm).

update public.tenants
set features = coalesce(features, '{}'::jsonb) || '{"seasonThemes": true}'::jsonb
where id = '00000000-0000-0000-0000-000000000001'; -- Gange-Rolv AS (samme id som 040)
