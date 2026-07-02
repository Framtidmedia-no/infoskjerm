-- Hardening: fast search_path på de to gjenværende SECURITY DEFINER RLS-helperne.
--
-- `get_my_role()` og `get_my_tenant_id()` manglet en fast `search_path` (de øvrige
-- 8 helperne — user_can_access_store, is_all_store_admin, content_reaches_my_store,
-- m.fl. — har allerede `search_path=public`). En SECURITY DEFINER-funksjon uten
-- fast search_path kan i teorien kapres hvis en angriper får CREATE på et skjema
-- som ligger tidligere i søkestien enn `public`. Disse to funksjonene er
-- bærende for tenant-isolasjonen (brukes inne i RLS-policyer), så vi låser stien.
--
-- `public` er korrekt: kroppene refererer ukvalifisert `users` (i public) og
-- returtypen `user_role` (public), samt skjema-kvalifisert `auth.uid()`. Oppslag
-- er derfor uendret; kun angrepsflaten fjernes. Verifisert med simulert JWT at
-- begge fortsatt returnerer riktig rolle/tenant etter endringen.
--
-- Ikke gjort (bevisst): REVOKE EXECUTE på disse/andre RLS-helpere fra
-- anon/authenticated. Funksjonene kalles inne i RLS-policyene, så innloggede
-- brukere MÅ ha EXECUTE — å fjerne det ville brutt RLS-evalueringen. De lekker
-- heller ingenting kalt direkte (scopet til auth.uid()).

alter function public.get_my_role() set search_path = public;
alter function public.get_my_tenant_id() set search_path = public;
