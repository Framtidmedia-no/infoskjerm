-- FAQ-seksjon på den offentlige produktsiden (kind 'faq': title = spørsmål,
-- body = svar). Redigeres i /admin/plattform/nettside som øvrige blokker.

alter table public.marketing_blocks drop constraint marketing_blocks_kind_check;
alter table public.marketing_blocks add constraint marketing_blocks_kind_check
  check (kind in ('hero', 'fact', 'stage', 'hardware', 'pricing', 'cta', 'footer', 'seo', 'page', 'faq'));

insert into public.marketing_blocks (kind, title, body, sort_order) values
  ('faq', 'Hva trenger vi av utstyr?', 'Én skjerm per visningsflate og én spiller per skjerm. Spilleren inngår i engangsbeløpet. Skjermpanelet kjøper dere selv — vi anbefaler kommersielle paneler for kontinuerlig drift, og hjelper dere med valget. Både stående og liggende montering støttes.', 1),
  ('faq', 'Hvem eier utstyret?', 'Dere. Både skjermpanelene og spillerne er deres. Vi drifter programvaren på spillerne så lenge avtalen løper.', 2),
  ('faq', 'Er det bindingstid?', 'Nei. Avtalen løper månedlig og kan sies opp skriftlig med én måneds varsel.', 3),
  ('faq', 'Hvor raskt vises endringer på skjermene?', 'I løpet av få minutter etter at dere publiserer i panelet. Ingen minnepinner, ingen manuelle runder.', 4),
  ('faq', 'Hva skjer hvis nettet faller ut?', 'Skjermen fortsetter å vise sist lastede innhold, og henter seg inn igjen når nettet er tilbake. Der nettet er ustabilt anbefaler vi 4G-tillegget.', 5),
  ('faq', 'Kan vi vise ulikt innhold per lokasjon?', 'Ja. Målrett innhold per skjerm, per enhet eller til alle — og alt kan tidsstyres med fra- og til-dato.', 6),
  ('faq', 'Må skjermene stå på hele døgnet?', 'Nei. Skjermene følger åpningstidene deres og skrur seg av og på automatisk.', 7),
  ('faq', 'Hvem lager innholdet?', 'Dere, i panelet — med ferdige innholdstyper for tilbud, nyheter, vær, nøkkeltall og arrangementer. Vi setter opp det første innholdet sammen med dere ved oppstart.', 8);
