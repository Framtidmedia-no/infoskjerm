-- Tillat sanert HTML (text/html) i media-bucketen for HTML-innholdstypen.
-- Filene saneres server-side (route: /api/admin/innhold/html-sanitize) FØR de
-- lagres — <script>, event-handlere og eksterne referanser fjernes, og en
-- streng CSP-meta injiseres. På skjermen vises de kun i en sandbox-iframe uten
-- script-kjøring, så en direkte innlasting av fila er ufarlig statisk visning.
--
-- Hele lista settes eksplisitt slik at migrasjonene matcher live-konfigen
-- (samme mønster som 021_media_allow_mov.sql / 039_media_allow_powerpoint.sql).
update storage.buckets
set allowed_mime_types = array[
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v',
  'text/html'
]
where id = 'media';
