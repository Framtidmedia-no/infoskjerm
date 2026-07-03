-- Sikkerhetsfikser fra SIKKERHETSRAPPORT.md (2026-07-03). Applisert til prod
-- fcxwrfmdvfjulhoebceq via MCP etter dry-run (rullet tilbake) per rolle.

-- ── 1) KRITISK: users self-privilege-escalation ────────────────────────────
-- Policy tenant_isolation på users er FOR ALL uten WITH CHECK/rollevern, så en
-- innlogget bruker kunne PATCHe egen rad til role='super_admin' via PostgREST.
-- Trigger blokkerer endring av role/tenant/chain for alle utenom backend
-- (service-role, auth.uid() null) og admins (super_admin/chain_manager).
create or replace function public.prevent_user_privilege_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $fn$
begin
  if auth.uid() is null or public.get_my_role() in ('super_admin','chain_manager') then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.tenant_id is distinct from old.tenant_id
     or new.chain_id is distinct from old.chain_id then
    raise exception 'Ikke tillatt å endre role/tenant/chain uten admin-rettigheter';
  end if;
  return new;
end $fn$;

drop trigger if exists users_prevent_privilege_change on public.users;
create trigger users_prevent_privilege_change
  before update on public.users
  for each row execute function public.prevent_user_privilege_change();

-- ── 2) HØY: screens anon-token-lekkasje ────────────────────────────────────
-- screen_token_read var FOR SELECT USING(true) → anon-nøkkelen kunne liste ALLE
-- skjermtokens på tvers av tenants. Skjerm-/widget-sidene leser via service-role
-- (bypasser RLS), så policyen er ren angrepsflate. Scope til request-tokenet.
drop policy if exists screen_token_read on public.screens;
create policy screen_token_read on public.screens
  for select
  using (token = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'token'));

-- ── 3) HØY: screens tenant-only → per-butikk (som stores/content_items) ─────
drop policy if exists tenant_isolation on public.screens;
create policy screens_store_access on public.screens
  for all
  using (
    tenant_id = get_my_tenant_id()
    and (is_all_store_admin() or (store_id is not null and user_can_access_store(store_id)))
  )
  with check (
    tenant_id = get_my_tenant_id()
    and (is_all_store_admin() or (store_id is not null and user_can_access_store(store_id)))
  );

-- ── 4) LAV: play_log kryss-tenant INSERT ───────────────────────────────────
-- Fjern OR auth.role()='authenticated' som lot enhver innlogget bruker skrive
-- play_log for vilkårlig tenant/skjerm. Behold token-basert skjerm-insert.
drop policy if exists "screens can insert own play_log" on public.play_log;
create policy "screens can insert own play_log" on public.play_log
  for insert
  with check (
    screen_id in (
      select screens.id from public.screens
      where screens.token = (nullif(current_setting('request.jwt.claims', true), '')::json ->> 'token')
    )
  );
