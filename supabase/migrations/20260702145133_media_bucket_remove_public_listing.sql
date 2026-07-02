-- Tenant-isolasjon: fjern anonym LISTING av media-bucketen.
--
-- Problem (bekreftet live 2026-07-02): media-bucketen er `public`, og hadde to
-- brede SELECT-policyer for rollen `public` (`Public read` + `public_read`, begge
-- `USING (bucket_id = 'media')`). Rollen `public` inkluderer `anon`, så hvem som
-- helst med den offentlige anon-nøkkelen (som ligger i hver nettleser) kunne kalle
-- Storage list-API-et og enumerere ALLE filer på tvers av ALLE tenants
-- (uploads/, tenant-logos/, kundeavis/, chain-logos/, catering/) og deretter laste
-- dem ned via den offentlige objekt-URL-en. Filnavn under uploads/ er ugjettbare
-- UUID-er enkeltvis, men listing gjør dem fullt enumererbare.
--
-- Fiks: dropp begge de brede SELECT-policyene. Ingen SELECT-policy => `anon` og
-- `authenticated` kan ikke lenger LISTE bucketen via Storage-API-et.
--
-- Hvorfor dette IKKE svartlegger skjermer: bucketen er `public`, så objekter
-- serveres fortsatt uten RLS via `/storage/v1/object/public/media/<sti>` — som er
-- akkurat det `getPublicUrl()` bruker, og det appen faktisk gjør overalt. Appen
-- kaller aldri `storage.list()`/`.download()`, så listing var ren angreps­flate
-- uten funksjonell nytte. Opplasting (INSERT, authenticated) og sletting (DELETE,
-- eier) er upåvirket.

drop policy if exists "public_read" on storage.objects;
drop policy if exists "Public read" on storage.objects;
