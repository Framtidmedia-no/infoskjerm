-- Åpningstider per butikk + automatisk TV-styring (HDMI-CEC) per skjerm.
--
-- stores.apningstider: {mon..sun: {"opens":"07:00","closes":"23:00"} | null}.
--   null-dag = stengt den dagen. Kolonnen NULL = aldri konfigurert → skjermene
--   står alltid på (manglende konfig skal aldri svarte skjermer).
--
-- screens.power_mode: 'auto' følger butikkens åpningstider (± lead/lag),
--   'always_on' slår aldri av automatisk. Manuell overstyring fra admin lagres
--   i power_override og gjelder til power_override_until (neste planlagte
--   overgang, beregnet i appen ved klikk).
--
-- screens.power_state (fra 010) gjenbrukes som sist RAPPORTERTE TV-status fra
-- Pi-agenten; power_state_at er rapport-tidspunktet.

alter table public.stores
  add column if not exists apningstider jsonb;

alter table public.screens
  add column if not exists power_mode text not null default 'auto',
  add column if not exists power_on_lead_min integer not null default 15,
  add column if not exists power_off_lag_min integer not null default 15,
  add column if not exists power_override text,
  add column if not exists power_override_until timestamptz,
  add column if not exists power_state_at timestamptz;

do $$ begin
  alter table public.screens
    add constraint screens_power_mode_chk check (power_mode in ('auto', 'always_on'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.screens
    add constraint screens_power_override_chk check (power_override in ('on', 'off'));
exception when duplicate_object then null; end $$;
