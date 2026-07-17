-- Offentlig produktside (marketing) — CMS-tabeller + seed.
-- Innholdet på / (hero, fakta-stripe, ticker, prosess-steg, priser, CTA, footer,
-- SEO) bor i DB og redigeres under /admin/plattform/nettside. Lesing er
-- offentlig (anon SELECT); all skriving går via service-role i super_admin-
-- gatede server actions.

create table if not exists public.marketing_blocks (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('hero', 'fact', 'stage', 'hardware', 'pricing', 'cta', 'footer', 'seo')),
  title text not null default '',
  body text not null default '',
  extra jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.marketing_prices (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  period text not null,
  quantity_label text not null default 'alle',
  price_nok integer not null,
  unit text not null default 'per skjerm',
  sort_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.marketing_blocks enable row level security;
alter table public.marketing_prices enable row level security;

-- Offentlig lesing — dette er nettopp innholdet på den offentlige siden.
-- Ingen write-policies: skriving skjer kun med service-role.
create policy "marketing_blocks_public_read"
  on public.marketing_blocks for select
  to anon, authenticated
  using (true);

create policy "marketing_prices_public_read"
  on public.marketing_prices for select
  to anon, authenticated
  using (true);

-- Seed — ekte innhold slik at siden er komplett fra første deploy.
insert into public.marketing_blocks (kind, title, body, extra, sort_order) values
  (
    'seo',
    'Infoskjerm — skjermer i butikk, styrt fra ett panel | Framtid Tech',
    'Skjermplattform for kjeder: publiser tilbud, nyheter og nøkkeltall til alle butikkskjermer fra ett panel. Oppsett, overvåking og drift fra Framtid Tech.',
    '{}'::jsonb,
    0
  ),
  (
    'hero',
    E'Én kjede.\nAlle skjermer.',
    'Infoskjerm er skjermplattformen fra Framtid Tech: vi setter opp og drifter spillerne, dere styrer innholdet fra ett panel. I daglig drift i norske butikkjeder.',
    '{"meta_line": "Framtid Tech ◆ Infoskjerm ◆ For kjeder og butikker", "cta_label": "Ta kontakt", "cta_url": "https://framtidtech.no/kontakt", "secondary_label": "Se prisene", "secondary_url": "#priser", "ticker_items": "Tilbud ◆ Nyheter ◆ Vær ◆ Nøkkeltall ◆ Åpningstider ◆ Arrangementer ◆ Kundeklubb"}'::jsonb,
    0
  ),
  ('fact', 'Publisering', 'Fra ett panel', '{}'::jsonb, 1),
  ('fact', 'Målretting', 'Butikk · avdeling · kjede', '{}'::jsonb, 2),
  ('fact', 'Innhold', 'Tilbud, nyheter, vær, nøkkeltall', '{}'::jsonb, 3),
  ('fact', 'Drift', 'Overvåket av Framtid Tech', '{}'::jsonb, 4),
  (
    'stage',
    'Oppsett',
    'Vi konfigurerer en spiller per skjerm, kobler den mot deres kontoer og gjør den klar for veggen. Skjermpanelene kjøper dere selv — vi anbefaler kommersielle skjermer bygget for lange driftsdøgn, og hjelper dere med valget.',
    '{}'::jsonb,
    1
  ),
  (
    'stage',
    'Innhold',
    'Publiser tilbud, nyheter, arrangementer og nøkkeltall fra admin-panelet. Målrett per butikk, per avdeling eller hele kjeden — med fra- og til-dato på alt.',
    '{}'::jsonb,
    2
  ),
  (
    'stage',
    'Visning',
    'Skjermene henter innholdet selv. Én endring i panelet, og hver skjerm i kjeden viser det i løpet av få minutter — uten minnepinner og uten butikkrunder.',
    '{}'::jsonb,
    3
  ),
  (
    'stage',
    'Drift',
    'Vi overvåker spillerne og følger med på at skjermene lever. Skjermene skrur seg av og på etter butikkens åpningstider, og dere når oss når noe skal endres.',
    '{}'::jsonb,
    4
  ),
  (
    'hardware',
    'Skjermene kjøper dere selv',
    'Plattformen leverer innholdet — panelet på veggen velger dere. Vi anbefaler kommersielle skjermer beregnet for kontinuerlig drift (16/7 eller 24/7), i stedet for forbruker-TV-er som ikke er bygget for butikkdøgnet. Vi hjelper dere gjerne med modellvalg og antall før oppstart.',
    '{}'::jsonb,
    0
  ),
  (
    'pricing',
    'Priser',
    'Månedsprisen følger antall skjermer — flere skjermer gir lavere pris per skjerm. Oppsett og spiller-hardware betales én gang per skjerm.',
    '{"footnote": "Priser eks. mva. Skjermpaneler kjøpes av kunden."}'::jsonb,
    0
  ),
  (
    'cta',
    'Skal kjeden deres på skjerm?',
    'Fortell oss hvor mange butikker og skjermer det gjelder, så kommer vi tilbake med et konkret forslag.',
    '{"cta_label": "Ta kontakt", "cta_url": "https://framtidtech.no/kontakt"}'::jsonb,
    0
  ),
  (
    'footer',
    'Publiser én gang — hver skjerm følger.',
    '',
    '{}'::jsonb,
    0
  );

insert into public.marketing_prices (product, period, quantity_label, price_nok, unit, sort_order) values
  ('Infoskjerm', 'Månedlig', '1–4 skjermer', 249, 'per skjerm', 1),
  ('Infoskjerm', 'Månedlig', '5–19 skjermer', 199, 'per skjerm', 2),
  ('Infoskjerm', 'Månedlig', '20+ skjermer', 179, 'per skjerm', 3),
  ('Infoskjerm 4G-tillegg', 'Månedlig', 'alle', 249, 'per skjerm', 4),
  ('Infoskjerm-oppsett og hardware', 'Engang', 'alle', 2990, 'per skjerm', 5);
