-- supabase/migrations/020_chain_logo.sql
-- Kjedelogo: hver kjede (EUROSPAR/SPAR/JOKER) kan ha en opplastet logo som
-- vises på tilbudskortet på kundeskjermen for butikker i den kjeden.
-- Logoen lastes opp i Innstillinger og lagres i 'media'-bucketen (public read).

ALTER TABLE chains
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN chains.logo_url IS 'Public URL til kjedelogo i media-bucket. Vises på tilbudskort/kundeskjerm per butikks kjede.';
