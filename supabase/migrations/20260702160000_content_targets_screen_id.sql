-- Per-skjerm-publisering: innhold kan målrettes mot enkeltskjermer (screens-rader),
-- ikke bare butikker/tagger. Et innslag med screen-targets vises KUN på de skjermene
-- (håndheves i leveringslaget, src/lib/content/targeting.ts) — target_all/store/tag
-- er uendret for alt annet innhold. Kallenavn bruker eksisterende screens.name.
alter table public.content_targets
  add column if not exists screen_id uuid references public.screens(id) on delete cascade;

create index if not exists content_targets_screen_idx
  on public.content_targets (screen_id)
  where screen_id is not null;
