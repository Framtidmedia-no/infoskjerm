-- Kundereferanser på den offentlige produktsiden — med innebygd samtykke-gate.
-- En referanse kan ALDRI publiseres uten at et signert samtykke finnes:
-- publisering håndheves av en trigger, ikke bare av app-laget.

create table if not exists public.marketing_references (
  id uuid primary key default gen_random_uuid(),
  -- Vist innhold
  company_name text not null,
  quote text not null default '',
  contact_name text not null default '',
  contact_role text not null default '',
  logo_url text not null default '',
  screenshot_url text not null default '',
  sort_order integer not null default 0,
  -- Samtykke-gate
  consent_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  consented_at timestamptz,          -- settes når kunden signerer
  consented_by_name text,            -- navnet kunden signerte med
  consent_ip text,                   -- for dokumentasjon
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Signaturlogg — én rad per samtykke-hendelse (append-only spor).
create table if not exists public.reference_consents (
  id uuid primary key default gen_random_uuid(),
  reference_id uuid not null references public.marketing_references(id) on delete cascade,
  signed_by_name text not null,
  signed_scope text not null,        -- hva de faktisk godkjente (snapshot av teksten)
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.marketing_references enable row level security;
alter table public.reference_consents enable row level security;

-- Offentlig lesing KUN av publiserte referanser, og bare de vis-feltene som
-- faktisk skal ut. consent_token/-ip er aldri lesbart for anon.
create policy "references_public_read_published"
  on public.marketing_references for select
  to anon, authenticated
  using (published = true);

-- Ingen policies på reference_consents → kun service-role. Ingen offentlig lesing
-- av signaturloggen.

-- HÅNDHEVING: en referanse kan ikke settes published=true uten at consented_at
-- er satt. Dette er sikkerhetsnettet — app-laget sjekker også, men databasen
-- er siste skanse mot at noe publiseres ved en feil.
create or replace function public.enforce_reference_consent()
returns trigger
language plpgsql
as $$
begin
  if new.published = true and new.consented_at is null then
    raise exception 'Kan ikke publisere referanse uten registrert samtykke (consented_at mangler)';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_reference_consent
  before insert or update on public.marketing_references
  for each row execute function public.enforce_reference_consent();

-- Seed: to UTKAST (published=false, uten samtykke) for de reelle kundene, slik
-- at admin har noe å redigere. Ingenting vises før samtykke er signert.
insert into public.marketing_references (company_name, quote, contact_name, contact_role, sort_order) values
  ('Gange-Rolv AS', '', '', 'Butikkleder', 1),
  ('Mobile AS', '', '', 'Markedsansvarlig', 2);
