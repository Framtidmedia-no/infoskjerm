-- Svinn kommentert/ikke kommentert per butikk (10 uker), fra Drift svinn_stats_10_weeks
create table if not exists store_svinn_kommentert (
  store_id uuid primary key references stores(id) on delete cascade,
  total_responses int,
  kommentert int,
  ikke_kommentert int,
  kommentert_prosent numeric,
  svinn_prosent numeric,
  synced_at timestamptz default now()
);
alter table store_svinn_kommentert enable row level security;
create policy "svinn_kommentert_select_authenticated" on store_svinn_kommentert for select to authenticated using (true);
