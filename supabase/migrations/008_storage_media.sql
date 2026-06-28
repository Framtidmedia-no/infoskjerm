-- supabase/migrations/008_storage_media.sql
-- Opprett media-storage-bucket for bildeopplasting
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Innloggede brukere kan laste opp
CREATE POLICY "authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media');

-- Alle kan lese (bilder vises på skjermene som ikke er innlogget)
CREATE POLICY "public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

-- Brukere kan slette sine egne filer
CREATE POLICY "authenticated_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'media' AND auth.uid() = owner);
