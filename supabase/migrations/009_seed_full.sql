-- ═══════════════════════════════════════════════════════════════
-- 009_seed_full.sql
-- Fullstendig seed-data for demo og utvikling
-- Idempotent — trygt å kjøre på nytt (ON CONFLICT DO NOTHING)
-- ═══════════════════════════════════════════════════════════════

-- Konstanter brukt gjennom hele filen:
--   tenant_id  : 00000000-0000-0000-0000-000000000001 (Gange-Rolv AS)
--   super_admin: 31152a8d-778c-458d-8500-5b756d58e608 (frank.lunde1981@gmail.com)
--   chain EUROSPAR: 00000000-0000-0000-0000-000000000010
--   chain JOKER   : 00000000-0000-0000-0000-000000000011
--   chain SPAR    : 00000000-0000-0000-0000-000000000012

-- ───────────────────────────────────────────────────────────────
-- SCREENS  (2 per butikk for 5 utvalgte butikker = 10 nye)
-- Eksisterende: f7ee0b78 (EUROSPAR MOA – Hoveddisplay) beholdes
-- ───────────────────────────────────────────────────────────────

INSERT INTO screens (id, tenant_id, store_id, name, token, status, last_seen_at) VALUES

  -- EUROSPAR BLINDHEIM  (0f25e067)
  ('aa000001-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '0f25e067-1139-48b7-a096-f5ce115a6436',
   'Blindheim – Inngang',
   'gr-blindheim-01', 'active',
   now() - interval '5 minutes'),

  ('aa000001-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '0f25e067-1139-48b7-a096-f5ce115a6436',
   'Blindheim – Kasse',
   'gr-blindheim-02', 'active',
   now() - interval '3 minutes'),

  -- EUROSPAR HAREID  (f01d7abb)
  ('aa000002-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'f01d7abb-536f-4908-ab46-a198c8ccb88e',
   'Hareid – Inngang',
   'gr-hareid-01', 'active',
   now() - interval '12 minutes'),

  ('aa000002-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'f01d7abb-536f-4908-ab46-a198c8ccb88e',
   'Hareid – Kasse',
   'gr-hareid-02', 'maintenance',
   now() - interval '2 days'),

  -- EUROSPAR LARSGÅRDEN  (366cb0d1)
  ('aa000003-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '366cb0d1-779e-4f79-9c70-8074816710fb',
   'Larsgården – Inngang',
   'gr-larsgarden-01', 'active',
   now() - interval '8 minutes'),

  ('aa000003-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '366cb0d1-779e-4f79-9c70-8074816710fb',
   'Larsgården – Kasse',
   'gr-larsgarden-02', 'active',
   now() - interval '6 minutes'),

  -- EUROSPAR ØRSTA  (8c6be9b2)
  ('aa000004-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '8c6be9b2-f913-4d39-8a82-85a74c60bc05',
   'Ørsta – Inngang',
   'gr-orsta-01', 'active',
   now() - interval '20 minutes'),

  ('aa000004-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   '8c6be9b2-f913-4d39-8a82-85a74c60bc05',
   'Ørsta – Kasse',
   'gr-orsta-02', 'inactive',
   now() - interval '3 hours'),

  -- SPAR ULSTEINVIK  (a73c7d03)
  ('aa000005-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'a73c7d03-19b5-49ed-af3c-0114245b601e',
   'Ulsteinvik – Inngang',
   'gr-ulsteinvik-01', 'active',
   now() - interval '1 hour'),

  ('aa000005-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'a73c7d03-19b5-49ed-af3c-0114245b601e',
   'Ulsteinvik – Kasse',
   'gr-ulsteinvik-02', 'active',
   now() - interval '45 minutes')

ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- CONTENT ITEMS  (14 stk — alle typer og statuser)
-- ───────────────────────────────────────────────────────────────

INSERT INTO content_items (
  id, tenant_id, type, title, body, status,
  created_by, approved_by,
  module_key, version,
  valid_from, valid_to,
  created_at, updated_at, published_at
) VALUES

-- ── NEWS ─────────────────────────────────────────────────────

-- 1. Live
('bb000001-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 'news', 'Ukens tilbud på ribeye',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "internal-news", "durationSeconds": 30, "fields": {"title": "Ukens tilbud på ribeye", "body": "Norsk Angus ribeye - 20% rabatt hele uken. Gjelder alle avdelinger.", "imageUrl": "https://picsum.photos/seed/ribeye/1920/1080", "publishDate": "2024-06-24"}}]}}',
 'live',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'internal-news', 1,
 now() - interval '2 days', now() + interval '5 days',
 now() - interval '3 days', now() - interval '2 days',
 now() - interval '2 days'),

-- 2. Live
('bb000001-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000001',
 'news', 'Nytt fra slakteriet',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "internal-news", "durationSeconds": 25, "fields": {"title": "Nytt fra slakteriet", "body": "Vi har fått inn fersk lammekjøtt direkte fra Sunnmøre. Spør i kjøttdisken!", "imageUrl": "https://picsum.photos/seed/butcher/1920/1080", "publishDate": "2024-06-25"}}]}}',
 'live',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'internal-news', 1,
 now() - interval '1 day', now() + interval '7 days',
 now() - interval '2 days', now() - interval '1 day',
 now() - interval '1 day'),

-- 3. Approved
('bb000001-0000-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000001',
 'news', 'Sesongvarer 2024 – Høst',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "seasonal-items", "durationSeconds": 20, "fields": {"title": "Sesongvarer 2024 – Høst", "body": "Nye sesongvarer er på plass! Viltkjøtt, rotgrønnsaker og hjemmelagde produkter.", "imageUrl": "https://picsum.photos/seed/seasonal/1920/1080"}}]}}',
 'approved',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'seasonal-items', 1,
 now() + interval '1 day', now() + interval '30 days',
 now() - interval '1 day', now() - interval '1 day',
 null),

-- ── COMPETITION ──────────────────────────────────────────────

-- 4. Live
('bb000002-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 'competition', 'Vinn grillpakke til sommer',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "competition", "durationSeconds": 30, "fields": {"title": "Vinn grillpakke til sommer!", "description": "Delta i vår sommerkonkurranse og vinn en komplett grillpakke til verdi 2000 kr. Registrer deg ved kassa.", "prize": "Grillpakke verdt 2000 kr", "deadline": "2024-07-31", "imageUrl": "https://picsum.photos/seed/bbq/1920/1080"}}]}}',
 'live',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'competition', 1,
 now() - interval '5 days', now() + interval '30 days',
 now() - interval '7 days', now() - interval '5 days',
 now() - interval '5 days'),

-- 5. Pending approval
('bb000002-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000001',
 'competition', 'Konkurransevinner kunngjøring',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "competition", "durationSeconds": 20, "fields": {"title": "Gratulerer til vinneren!", "description": "Ola Nordmann fra Blindheim vant vårkonkurransen. Premien hentes i butikken.", "prize": null, "deadline": null, "imageUrl": "https://picsum.photos/seed/winner/1920/1080"}}]}}',
 'pending_approval',
 '31152a8d-778c-458d-8500-5b756d58e608',
 null,
 'competition', 1,
 null, null,
 now() - interval '6 hours', now() - interval '6 hours',
 null),

-- ── STATS ────────────────────────────────────────────────────

-- 6. Live
('bb000003-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 'stats', 'Salgsstatistikk uke 26',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "sales-stats", "durationSeconds": 20, "fields": {"title": "Salgsresultat uke 26", "period": "Uke", "target": 850000, "actual": 912000}}]}}',
 'live',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'sales-stats', 1,
 now() - interval '3 days', now() + interval '4 days',
 now() - interval '4 days', now() - interval '3 days',
 now() - interval '3 days'),

-- 7. Pending approval
('bb000003-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000001',
 'stats', 'Bestselgere denne måneden',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "sales-stats", "durationSeconds": 25, "fields": {"title": "Bestselgere – Juni 2024", "period": "Måned", "target": 3500000, "actual": 3210000}}]}}',
 'pending_approval',
 '31152a8d-778c-458d-8500-5b756d58e608',
 null,
 'sales-stats', 1,
 null, null,
 now() - interval '12 hours', now() - interval '12 hours',
 null),

-- ── WEATHER ──────────────────────────────────────────────────

-- 8. Live
('bb000004-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 'weather', 'Vær – Ålesund',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "weather", "durationSeconds": 20, "fields": {"lat": "62.4722", "lon": "6.1495", "locationName": "Ålesund", "days": "3"}}]}}',
 'live',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'weather', 1,
 null, null,
 now() - interval '10 days', now() - interval '10 days',
 now() - interval '10 days'),

-- 9. Approved
('bb000004-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000001',
 'weather', 'Vær – Ørsta',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "weather", "durationSeconds": 20, "fields": {"lat": "62.1799", "lon": "6.1256", "locationName": "Ørsta", "days": "3"}}]}}',
 'approved',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'weather', 1,
 null, null,
 now() - interval '5 days', now() - interval '5 days',
 null),

-- ── SLIDE ────────────────────────────────────────────────────

-- 10. Live
('bb000005-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 'slide', 'Velkomstskjerm – Gange-Rolv',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "slide", "durationSeconds": 15, "fields": {"title": "Velkommen til Gange-Rolv!", "images": [], "duration_seconds": 15, "transition": "fade"}}]}}',
 'live',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'slide', 1,
 null, null,
 now() - interval '30 days', now() - interval '30 days',
 now() - interval '30 days'),

-- 11. Live
('bb000005-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000001',
 'slide', 'Tilbud på lam – Sommer 2024',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "product-offer", "durationSeconds": 20, "fields": {"product_name": "Norsk lammeskjær", "original_price": 189, "offer_price": 149, "imageUrl": "https://picsum.photos/seed/lamb/1920/1080", "valid_until": "2024-08-31"}}]}}',
 'live',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'product-offer', 1,
 now() - interval '4 days', now() + interval '60 days',
 now() - interval '5 days', now() - interval '4 days',
 now() - interval '4 days'),

-- 12. Approved
('bb000005-0000-0000-0000-000000000003',
 '00000000-0000-0000-0000-000000000001',
 'slide', 'Åpningstider sommeren 2024',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "company-info", "durationSeconds": 15, "fields": {"title": "Åpningstider sommeren 2024", "content": "Man–Fre: 07:00–22:00 | Lør: 08:00–20:00 | Søn: 10:00–18:00"}}]}}',
 'approved',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'company-info', 1,
 null, null,
 now() - interval '2 days', now() - interval '2 days',
 null),

-- 13. Draft
('bb000006-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000001',
 'news', 'Høstlansering 2024 – utkast',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "internal-news", "durationSeconds": 30, "fields": {"title": "Høstlansering 2024", "body": "Kommer snart – nye produkter for høstsesongen.", "imageUrl": "https://picsum.photos/seed/autumn/1920/1080"}}]}}',
 'draft',
 '31152a8d-778c-458d-8500-5b756d58e608',
 null,
 'internal-news', 1,
 null, null,
 now() - interval '1 hour', now() - interval '1 hour',
 null),

-- 14. Archived
('bb000006-0000-0000-0000-000000000002',
 '00000000-0000-0000-0000-000000000001',
 'stats', 'Påskekampanje 2024 – avsluttet',
 '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "sales-stats", "durationSeconds": 20, "fields": {"title": "Påskekampanje 2024", "period": "Uke", "target": 1200000, "actual": 1345000}}]}}',
 'archived',
 '31152a8d-778c-458d-8500-5b756d58e608',
 '31152a8d-778c-458d-8500-5b756d58e608',
 'sales-stats', 1,
 '2024-03-25', '2024-04-05',
 now() - interval '90 days', now() - interval '60 days',
 null)

ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- PLAYLISTS
-- ───────────────────────────────────────────────────────────────

INSERT INTO playlists (id, tenant_id, name, created_at) VALUES
  ('cc000001-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Daglig playlist – Blindheim',
   now() - interval '20 days'),

  ('cc000001-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Tilbud og nyheter',
   now() - interval '15 days'),

  ('cc000001-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Kasse-playlist',
   now() - interval '10 days')

ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- PLAYLIST ITEMS
-- ───────────────────────────────────────────────────────────────

INSERT INTO playlist_items (id, playlist_id, content_item_id, position, duration_seconds) VALUES

  -- Daglig playlist – Blindheim
  ('dd000001-0000-0000-0000-000000000001',
   'cc000001-0000-0000-0000-000000000001',
   'bb000005-0000-0000-0000-000000000001', 0, 15),   -- Velkomstskjerm

  ('dd000001-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000001',
   'bb000001-0000-0000-0000-000000000001', 1, 30),   -- Ukens tilbud på ribeye

  ('dd000001-0000-0000-0000-000000000003',
   'cc000001-0000-0000-0000-000000000001',
   'bb000004-0000-0000-0000-000000000001', 2, 20),   -- Vær – Ålesund

  ('dd000001-0000-0000-0000-000000000004',
   'cc000001-0000-0000-0000-000000000001',
   'bb000003-0000-0000-0000-000000000001', 3, 20),   -- Salgsstatistikk uke 26

  -- Tilbud og nyheter
  ('dd000002-0000-0000-0000-000000000001',
   'cc000001-0000-0000-0000-000000000002',
   'bb000001-0000-0000-0000-000000000002', 0, 25),   -- Nytt fra slakteriet

  ('dd000002-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000002',
   'bb000005-0000-0000-0000-000000000002', 1, 20),   -- Tilbud på lam

  ('dd000002-0000-0000-0000-000000000003',
   'cc000001-0000-0000-0000-000000000002',
   'bb000002-0000-0000-0000-000000000001', 2, 30),   -- Vinn grillpakke

  -- Kasse-playlist
  ('dd000003-0000-0000-0000-000000000001',
   'cc000001-0000-0000-0000-000000000003',
   'bb000002-0000-0000-0000-000000000001', 0, 30),   -- Vinn grillpakke

  ('dd000003-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000003',
   'bb000004-0000-0000-0000-000000000001', 1, 20)    -- Vær – Ålesund

ON CONFLICT (id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- SCREEN PLAYLISTS
-- ───────────────────────────────────────────────────────────────

INSERT INTO screen_playlists (screen_id, playlist_id, priority) VALUES

  -- Blindheim – Inngang: Daglig playlist
  ('aa000001-0000-0000-0000-000000000001',
   'cc000001-0000-0000-0000-000000000001', 0),

  -- Blindheim – Kasse: Kasse-playlist
  ('aa000001-0000-0000-0000-000000000002',
   'cc000001-0000-0000-0000-000000000003', 0),

  -- Hareid – Inngang: Tilbud og nyheter
  ('aa000002-0000-0000-0000-000000000001',
   'cc000001-0000-0000-0000-000000000002', 0),

  -- Larsgården – Inngang: Daglig playlist
  ('aa000003-0000-0000-0000-000000000001',
   'cc000001-0000-0000-0000-000000000001', 0)

ON CONFLICT (screen_id, playlist_id) DO NOTHING;

-- ───────────────────────────────────────────────────────────────
-- PUBLISH LOG  (historikk)
-- ───────────────────────────────────────────────────────────────

INSERT INTO publish_log (id, content_item_id, action, performed_by, snapshot, created_at) VALUES

  ('ee000001-0000-0000-0000-000000000001',
   'bb000001-0000-0000-0000-000000000001',
   'submitted',
   '31152a8d-778c-458d-8500-5b756d58e608',
   '{"status": "pending_approval", "title": "Ukens tilbud på ribeye"}',
   now() - interval '3 days'),

  ('ee000001-0000-0000-0000-000000000002',
   'bb000001-0000-0000-0000-000000000001',
   'approved',
   '31152a8d-778c-458d-8500-5b756d58e608',
   '{"status": "approved", "title": "Ukens tilbud på ribeye"}',
   now() - interval '2 days 12 hours'),

  ('ee000001-0000-0000-0000-000000000003',
   'bb000001-0000-0000-0000-000000000001',
   'published',
   '31152a8d-778c-458d-8500-5b756d58e608',
   '{"status": "live", "title": "Ukens tilbud på ribeye"}',
   now() - interval '2 days'),

  ('ee000002-0000-0000-0000-000000000001',
   'bb000002-0000-0000-0000-000000000001',
   'published',
   '31152a8d-778c-458d-8500-5b756d58e608',
   '{"status": "live", "title": "Vinn grillpakke til sommer"}',
   now() - interval '5 days'),

  ('ee000003-0000-0000-0000-000000000001',
   'bb000006-0000-0000-0000-000000000002',
   'archived',
   '31152a8d-778c-458d-8500-5b756d58e608',
   '{"status": "archived", "title": "Påskekampanje 2024 – avsluttet"}',
   now() - interval '60 days')

ON CONFLICT (id) DO NOTHING;
