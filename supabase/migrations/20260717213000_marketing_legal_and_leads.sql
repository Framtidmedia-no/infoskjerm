-- Marketing runde 2: juridiske sider (/personvern, /vilkar) + kontaktskjema.
-- - kind 'page' (CMS-drevne undersider med slug i extra)
-- - marketing_leads: innsendte henvendelser (service-role only, ingen policies)
-- - CTA-ene peker på #kontakt (skjema på siden) i stedet for framtidtech.no

alter table public.marketing_blocks drop constraint marketing_blocks_kind_check;
alter table public.marketing_blocks add constraint marketing_blocks_kind_check
  check (kind in ('hero', 'fact', 'stage', 'hardware', 'pricing', 'cta', 'footer', 'seo', 'page'));

create table if not exists public.marketing_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text not null default '',
  email text not null,
  phone text not null default '',
  scope text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);

-- Kun service-role: ingen policies i det hele tatt (RLS på = alt avvist for anon/authenticated).
alter table public.marketing_leads enable row level security;

-- CTA-ene på forsiden går nå til skjemaet; mottaker-adresse er CMS-styrt.
update public.marketing_blocks
  set extra = extra || '{"cta_url": "#kontakt"}'::jsonb, updated_at = now()
  where kind = 'hero';
update public.marketing_blocks
  set extra = extra || '{"cta_url": "#kontakt", "lead_recipient": "hei@framtidtech.no"}'::jsonb, updated_at = now()
  where kind = 'cta';

-- Juridiske sider. Body er markdown-lite: «## » = mellomtittel, «- » = punkt,
-- blank linje = nytt avsnitt.
insert into public.marketing_blocks (kind, title, body, extra, sort_order) values
  (
    'page',
    'Personvernerklæring',
    E'FRAMTID TECH AS er behandlingsansvarlig for personopplysninger som samles inn via dette nettstedet og Infoskjerm-tjenesten.\n\n## Behandlingsansvarlig\n- Firma: FRAMTID TECH AS\n- Organisasjonsnummer: 837 596 092\n- Adresse: Luhrtoppen 2, 1470 Lørenskog\n- E-post: hei@framtidtech.no\n- Telefon: +47 940 03 452\n\n## Hvilke opplysninger vi behandler\n- Kontaktskjemaet: navn, firma, e-postadresse, eventuelt telefonnummer, hvor mange skjermer/lokasjoner det gjelder, og meldingen din.\n- Brukere av plattformen (kunder): navn, e-postadresse, rolle og handlingslogg (hvem som endret hva), som del av avtalen med virksomheten din.\n- Tekniske logger som er nødvendige for drift og sikkerhet.\n\n## Formål og rettslig grunnlag\n- Besvare henvendelser fra kontaktskjemaet — berettiget interesse og tiltak før avtaleinngåelse (GDPR art. 6 nr. 1 b og f).\n- Levere og drifte tjenesten for innloggede brukere — avtale (art. 6 nr. 1 b).\n- Sikkerhet og misbruksvern — berettiget interesse (art. 6 nr. 1 f).\n\n## Informasjonskapsler\nDette nettstedet bruker ingen analyse- eller markedsføringscookies, og har derfor ikke samtykkebanner. Ved innlogging settes strengt nødvendige cookies for autentisering, og sikkerhetssjekken (Cloudflare Turnstile) kan sette funksjonelle cookies. Besøksstatistikk samles eventuelt inn uten cookies og uten identifisering av enkeltpersoner (Vercel Web Analytics).\n\n## Databehandlere\n- Supabase (database og innlogging) — data lagres i EU (Stockholm).\n- Vercel (hosting av nettstedet) — EU/USA, EUs standardkontraktsvilkår.\n- Cloudflare (sikkerhetssjekk på skjemaer og innlogging).\n- Resend (utsendelse av e-post) — USA, EUs standardkontraktsvilkår.\n- Hetzner (server for visningsmotoren) — Tyskland/Finland.\n\n## Lagringstid\n- Henvendelser fra kontaktskjemaet slettes senest 12 måneder etter at dialogen er avsluttet.\n- Brukerkontoer og handlingslogg lagres så lenge kundeforholdet varer, og slettes deretter.\n\n## Dine rettigheter\nDu har rett til innsyn, retting, sletting, begrensning, dataportabilitet og til å protestere mot behandlingen. Kontakt oss på hei@framtidtech.no, så svarer vi uten ugrunnet opphold. Du kan også klage til Datatilsynet.',
    '{"slug": "personvern"}'::jsonb,
    1
  ),
  (
    'page',
    'Vilkår for Infoskjerm',
    E'Disse vilkårene gjelder for leveranse av skjermplattformen Infoskjerm fra FRAMTID TECH AS (org.nr. 837 596 092) til bedriftskunder.\n\n## Tjenesten\nInfoskjerm er en plattform for publisering og styring av innhold på skjermer. Leverandøren setter opp og drifter spiller-enhetene og programvaren; kunden styrer innholdet fra administrasjonspanelet.\n\n## Priser og betaling\n- Abonnementet prises per skjerm per måned etter gjeldende prisliste på infoskjerm.framtidtech.no. Prisen følger antall skjermer i avtalen.\n- Oppsett og spiller-hardware betales som et engangsbeløp per skjerm.\n- 4G-tillegg prises per skjerm per måned der det er avtalt.\n- Alle priser er oppgitt eksklusive merverdiavgift. Abonnementet faktureres månedlig.\n- Prisendringer varsles med minst én måneds skriftlig varsel.\n\n## Utstyr\n- Skjermpaneler kjøpes og eies av kunden. Vi anbefaler kommersielle skjermer beregnet for kontinuerlig drift og bistår gjerne med valget.\n- Spiller-enheten dekkes av engangsbeløpet og tilhører kunden. Leverandøren administrerer programvaren på enheten så lenge avtalen løper.\n\n## Varighet og oppsigelse\nAvtalen løper månedlig og kan sies opp skriftlig av hver av partene med én måneds varsel til utgangen av en kalendermåned.\n\n## Drift og tilgjengelighet\nLeverandøren overvåker tjenesten og retter feil innen rimelig tid. Planlagt vedlikehold varsles. Tjenesten leveres uten garantert oppetid; skjermvisningen er robust mot kortere nettbrudd, og 4G-tillegget gir redundans der nettet er ustabilt.\n\n## Ansvar\nLeverandørens samlede erstatningsansvar er begrenset til det kunden har betalt for tjenesten de siste tolv månedene. Leverandøren svarer ikke for indirekte tap.\n\n## Personopplysninger\nBehandling av personopplysninger er beskrevet i personvernerklæringen. Der leverandøren behandler personopplysninger på vegne av kunden, inngås databehandleravtale.\n\n## Endringer og lovvalg\nVilkårene kan endres med én måneds varsel. Avtalen reguleres av norsk rett med Romerike og Glåmdal tingrett som verneting.',
    '{"slug": "vilkar"}'::jsonb,
    2
  );
