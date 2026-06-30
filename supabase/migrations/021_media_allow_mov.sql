-- supabase/migrations/021_media_allow_mov.sql
-- Tillat QuickTime (.mov) og .m4v i media-bucketen. iPhone-opptak er .mov,
-- og editor/widget støtter allerede disse (isVideoUrl dekker mov/m4v).
-- Setter hele lista eksplisitt slik at migrasjonene matcher live-konfigen.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'application/pdf',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'
]
WHERE id = 'media';
