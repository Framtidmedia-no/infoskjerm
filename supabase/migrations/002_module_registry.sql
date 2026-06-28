-- ═══════════════════════════════════════════════════════════════
-- Sprint 2: Modul-register, zone-layouts, publish-logg
-- ═══════════════════════════════════════════════════════════════

-- ─── module_registry ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS module_registry (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text    UNIQUE NOT NULL,
  name        text    NOT NULL,
  category    text    NOT NULL,
  description text,
  icon        text    DEFAULT 'box',
  schema      jsonb   NOT NULL DEFAULT '{}',
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─── tenant_modules ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_modules (
  tenant_id   uuid    REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  module_key  text    REFERENCES module_registry(key) ON DELETE CASCADE NOT NULL,
  enabled_by  uuid    REFERENCES users(id),
  enabled_at  timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, module_key)
);

-- ─── zone_layouts ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS zone_layouts (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid    REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  chain_id    uuid    REFERENCES chains(id),
  name        text    NOT NULL,
  description text,
  layout      jsonb   NOT NULL DEFAULT '{}',
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ─── publish_log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publish_log (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id  uuid    REFERENCES content_items(id) ON DELETE SET NULL,
  action           text    NOT NULL,
  performed_by     uuid    REFERENCES users(id),
  snapshot         jsonb   NOT NULL DEFAULT '{}',
  created_at       timestamptz DEFAULT now()
);

-- ─── Utvidelse av content_items ──────────────────────────────
ALTER TABLE content_items
  ADD COLUMN IF NOT EXISTS module_key  text REFERENCES module_registry(key),
  ADD COLUMN IF NOT EXISTS zone_id     text,
  ADD COLUMN IF NOT EXISTS version     integer DEFAULT 1;

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE module_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_modules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_layouts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE publish_log     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "module_registry_read" ON module_registry
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "module_registry_admin" ON module_registry
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "tenant_modules_tenant" ON tenant_modules
  FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY "zone_layouts_tenant" ON zone_layouts
  FOR ALL USING (tenant_id = get_my_tenant_id());

CREATE POLICY "publish_log_tenant_read" ON publish_log
  FOR SELECT USING (
    content_item_id IN (
      SELECT id FROM content_items WHERE tenant_id = get_my_tenant_id()
    )
  );

CREATE POLICY "publish_log_insert" ON publish_log
  FOR INSERT WITH CHECK (
    content_item_id IN (
      SELECT id FROM content_items WHERE tenant_id = get_my_tenant_id()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- SEED: 12 fase-1 moduler
-- ═══════════════════════════════════════════════════════════════

INSERT INTO module_registry (key, name, category, description, icon, schema) VALUES

('internal-news', 'Interne nyheter', 'intern_info',
 'Nyheter og oppdateringer for ansatte. Rik tekst med bilde.',
 'newspaper',
 '{"fields": [
   {"key": "title", "label": "Tittel", "type": "text", "required": true},
   {"key": "body", "label": "Brødtekst", "type": "richtext", "required": true},
   {"key": "image_url", "label": "Bilde", "type": "image", "required": false},
   {"key": "highlight_color", "label": "Aksentfarge", "type": "color", "required": false}
 ]}'::jsonb),

('emergency-message', 'Viktig beskjed', 'intern_info',
 'Kritiske meldinger som vises fremhevet på alle skjermer.',
 'alert-triangle',
 '{"fields": [
   {"key": "title", "label": "Tittel", "type": "text", "required": true},
   {"key": "message", "label": "Melding", "type": "textarea", "required": true},
   {"key": "severity", "label": "Alvorlighetsgrad", "type": "select", "options": ["info","warning","critical"], "required": true}
 ]}'::jsonb),

('shift-schedule', 'Vaktplan', 'intern_info',
 'Viser ukens vaktplan for de ansatte.',
 'calendar',
 '{"fields": [
   {"key": "week_label", "label": "Uke", "type": "text", "required": true},
   {"key": "shifts", "label": "Vakter (JSON)", "type": "json", "required": true}
 ]}'::jsonb),

('employee-spotlight', 'Ansatt i fokus', 'intern_info',
 'Fremhev en ansatt med bilde og tekst.',
 'user-round',
 '{"fields": [
   {"key": "name", "label": "Navn", "type": "text", "required": true},
   {"key": "title", "label": "Stilling", "type": "text", "required": false},
   {"key": "message", "label": "Melding", "type": "textarea", "required": false},
   {"key": "image_url", "label": "Bilde", "type": "image", "required": false}
 ]}'::jsonb),

('training-material', 'Opplæringsmateriell', 'intern_info',
 'Opplæringsinnhold og prosedyrer for ansatte.',
 'graduation-cap',
 '{"fields": [
   {"key": "title", "label": "Tittel", "type": "text", "required": true},
   {"key": "body", "label": "Innhold", "type": "richtext", "required": true},
   {"key": "category", "label": "Kategori", "type": "select", "options": ["HMS","Kundeservice","Produktkunnskap","Rutiner"], "required": false}
 ]}'::jsonb),

('product-offer', 'Produkttilbud', 'salg_tilbud',
 'Fremhev et produkt med pris, bilde og kampanjetekst.',
 'tag',
 '{"fields": [
   {"key": "product_name", "label": "Produktnavn", "type": "text", "required": true},
   {"key": "original_price", "label": "Ordinær pris", "type": "number", "required": false},
   {"key": "offer_price", "label": "Tilbudspris", "type": "number", "required": true},
   {"key": "image_url", "label": "Produktbilde", "type": "image", "required": false},
   {"key": "valid_until", "label": "Gjelder til", "type": "date", "required": false}
 ]}'::jsonb),

('competition', 'Konkurranse', 'salg_tilbud',
 'Konkurranse med premie for ansatte eller kunder.',
 'trophy',
 '{"fields": [
   {"key": "title", "label": "Tittel", "type": "text", "required": true},
   {"key": "description", "label": "Beskrivelse", "type": "richtext", "required": true},
   {"key": "prize", "label": "Premie", "type": "text", "required": false},
   {"key": "deadline", "label": "Frist", "type": "date", "required": false},
   {"key": "image_url", "label": "Bilde", "type": "image", "required": false}
 ]}'::jsonb),

('sales-stats', 'Salgstall', 'salg_tilbud',
 'Salgsstatistikk og KPI-er i visuelt format.',
 'bar-chart-3',
 '{"fields": [
   {"key": "title", "label": "Tittel", "type": "text", "required": true},
   {"key": "period", "label": "Periode", "type": "select", "options": ["Dag","Uke","Måned","År"], "required": true},
   {"key": "target", "label": "Mål (kr)", "type": "number", "required": false},
   {"key": "actual", "label": "Faktisk (kr)", "type": "number", "required": true}
 ]}'::jsonb),

('weather', 'Vær', 'informasjon',
 'Lokalt værvarselet via Yr.no.',
 'cloud-sun',
 '{"fields": [
   {"key": "location_name", "label": "Stedsnavn", "type": "text", "required": true},
   {"key": "lat", "label": "Breddegrad", "type": "number", "required": true},
   {"key": "lon", "label": "Lengdegrad", "type": "number", "required": true},
   {"key": "days", "label": "Antall dager", "type": "select", "options": ["1","3","5"], "required": false}
 ]}'::jsonb),

('company-info', 'Bedriftsinformasjon', 'informasjon',
 'Kontaktinfo, åpningstider og annen butikkinformasjon.',
 'building-2',
 '{"fields": [
   {"key": "title", "label": "Tittel", "type": "text", "required": true},
   {"key": "content", "label": "Innhold", "type": "richtext", "required": true}
 ]}'::jsonb),

('lunch-menu', 'Lunsjmeny', 'informasjon',
 'Dagens og ukens lunsjmeny.',
 'utensils',
 '{"fields": [
   {"key": "date_label", "label": "Dag/uke", "type": "text", "required": true},
   {"key": "items", "label": "Retter (JSON)", "type": "json", "required": true},
   {"key": "image_url", "label": "Bilde", "type": "image", "required": false}
 ]}'::jsonb),

('slide', 'Bildeserie', 'media',
 'Bildekarusell med valgfri tekst-overlay.',
 'images',
 '{"fields": [
   {"key": "title", "label": "Tittel", "type": "text", "required": false},
   {"key": "images", "label": "Bilder", "type": "image_list", "required": true},
   {"key": "duration_seconds", "label": "Sekunder per bilde", "type": "number", "required": false},
   {"key": "transition", "label": "Overgang", "type": "select", "options": ["fade","slide","zoom"], "required": false}
 ]}'::jsonb)

ON CONFLICT (key) DO NOTHING;
