-- Driftstall per butikk per uke, synket daglig fra Gange-Rolv Drift (bonus_nokkeltall)
create table if not exists store_kpi_week (
  store_id uuid references stores(id) on delete cascade not null,
  uke int not null,
  ar int not null,
  netto_omsetning bigint,
  budsjett_omsetning bigint,
  netto_omsetning_fjoraaret bigint,
  brutto_kr bigint,
  budsjett_brutto_kr bigint,
  lonn_kr bigint,
  budsjett_lonn bigint,
  svinn_total bigint,
  svinn_total_fjoraaret bigint,
  budsjett_svinn_gras bigint,
  importert_tidspunkt timestamptz,
  synced_at timestamptz default now(),
  primary key (store_id, ar, uke)
);
alter table store_kpi_week enable row level security;
create policy "kpi_select_authenticated" on store_kpi_week for select to authenticated using (true);
