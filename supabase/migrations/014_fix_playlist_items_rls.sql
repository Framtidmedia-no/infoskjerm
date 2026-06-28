-- Fix RLS policies for playlist_items table
-- Tenant isolation via playlists → users join

alter table public.playlist_items enable row level security;

drop policy if exists "playlist_items_select" on public.playlist_items;
drop policy if exists "playlist_items_insert" on public.playlist_items;
drop policy if exists "playlist_items_update" on public.playlist_items;
drop policy if exists "playlist_items_delete" on public.playlist_items;

create policy "playlist_items_select" on public.playlist_items
  for select using (
    exists (
      select 1 from public.playlists pl
      join public.users u on u.tenant_id = pl.tenant_id
      where pl.id = playlist_items.playlist_id
        and u.id = auth.uid()
    )
  );

create policy "playlist_items_insert" on public.playlist_items
  for insert with check (
    exists (
      select 1 from public.playlists pl
      join public.users u on u.tenant_id = pl.tenant_id
      where pl.id = playlist_items.playlist_id
        and u.id = auth.uid()
    )
  );

create policy "playlist_items_update" on public.playlist_items
  for update using (
    exists (
      select 1 from public.playlists pl
      join public.users u on u.tenant_id = pl.tenant_id
      where pl.id = playlist_items.playlist_id
        and u.id = auth.uid()
    )
  );

create policy "playlist_items_delete" on public.playlist_items
  for delete using (
    exists (
      select 1 from public.playlists pl
      join public.users u on u.tenant_id = pl.tenant_id
      where pl.id = playlist_items.playlist_id
        and u.id = auth.uid()
    )
  );
