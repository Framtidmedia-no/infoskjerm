-- Enhets-styring, ren modell: hver skjerm-rad kan bindes til ÉN fysisk Xibo-
-- skjerm (display) via xibo_display_id. Er den satt, er raden en Raspberry Pi
-- som Xibo styrer; er den null, er raden en kiosk-skjerm (telefon/nettbrett som
-- laster /skjerm/<token> direkte — ingen Pi/Xibo).
--
-- Én Xibo-display kan kun bindes til én rad per tenant (partial unique). Slik blir
-- fleet-oversikten kilden: tilkoblede displays dukker opp og tildeles inline,
-- ubegrenset antall per butikk/flate/avdeling.
alter table public.screens
  add column if not exists xibo_display_id bigint;

create unique index if not exists screens_tenant_xibo_display_uidx
  on public.screens (tenant_id, xibo_display_id)
  where xibo_display_id is not null;
