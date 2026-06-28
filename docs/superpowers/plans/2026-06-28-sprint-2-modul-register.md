# Sprint 2: Modul-register & Zone-layouts — Implementasjonsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Mål:** Alle 12 fase-1 modultyper lagret i database (ikke i kode). Zone-layout-system for skjermer. Publiseringslogg for angre/rollback. TypeScript-typer regenerert. Admin-UI for modul-register.

**Arkitektur:** Ny migrasjonsfil `002_module_registry.sql` med 4 nye tabeller + utvidelse av `content_items`. Seed via migrasjonen selv (data er strukturell, ikke testdata). TypeScript-typer regenerert via Supabase MCP. Admin-side `/admin/modules` for å bla gjennom og aktivere/deaktivere moduler per tenant.

**Tech Stack:** Supabase PostgreSQL, Supabase MCP (`apply_migration`, `generate_typescript_types`), Next.js Server Components, Tailwind CSS 4

**Supabase project-ID:** `fcxwrfmdvfjulhoebceq`

---

## Filstruktur

```
Opprette:
  supabase/migrations/002_module_registry.sql     – 4 nye tabeller + seed
  src/lib/admin/modules.ts                        – Query-funksjoner for moduler
  src/lib/admin/modules.test.ts                   – Vitest-tester
  src/app/admin/modules/page.tsx                  – Modul-register admin-side
  src/app/admin/modules/_components/module-card.tsx – Modul-kort med toggle

Modifisere:
  src/types/database.ts                           – Regenerert fra Supabase
  src/components/admin/sidebar.tsx                – Legg til "Moduler" nav-lenke
```

---

## Task 1: Migrasjonsfil — 4 nye tabeller + seed

**Filer:**
- Opprett: `supabase/migrations/002_module_registry.sql`

- [ ] **Steg 1: Opprett migrasjonsfilen**

Fil: `supabase/migrations/002_module_registry.sql`

```sql
-- ═══════════════════════════════════════════════════════════════
-- Sprint 2: Modul-register, zone-layouts, publish-logg
-- ═══════════════════════════════════════════════════════════════

-- ─── module_registry ─────────────────────────────────────────
-- Registeret over alle tilgjengelige modultyper i systemet.
-- Ingen modultyper er hardkodet i applikasjonskoden.
CREATE TABLE IF NOT EXISTS module_registry (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text    UNIQUE NOT NULL,          -- maskinlesbar ID, f.eks. 'internal-news'
  name        text    NOT NULL,                 -- visningsnavn, f.eks. 'Interne nyheter'
  category    text    NOT NULL,                 -- 'intern_info' | 'salg_tilbud' | 'informasjon' | 'media' | 'underholdning'
  description text,
  icon        text    DEFAULT 'box',            -- Lucide-ikonnavn
  schema      jsonb   NOT NULL DEFAULT '{}',    -- JSON Schema for konfig-felter
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─── tenant_modules ──────────────────────────────────────────
-- Hvilke moduler en tenant har aktivert. Super-admin aktiverer,
-- tenant velger hvilke de faktisk bruker.
CREATE TABLE IF NOT EXISTS tenant_modules (
  tenant_id   uuid    REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  module_key  text    REFERENCES module_registry(key) ON DELETE CASCADE NOT NULL,
  enabled_by  uuid    REFERENCES users(id),
  enabled_at  timestamptz DEFAULT now(),
  PRIMARY KEY (tenant_id, module_key)
);

-- ─── zone_layouts ────────────────────────────────────────────
-- Kjede-spesifikke sone-oppsett for skjermer.
-- layout-kolonnen definerer et CSS grid med navngitte soner.
CREATE TABLE IF NOT EXISTS zone_layouts (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid    REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
  chain_id    uuid    REFERENCES chains(id),   -- null = gjelder alle kjeder i tenant
  name        text    NOT NULL,
  description text,
  layout      jsonb   NOT NULL DEFAULT '{}',   -- {cols, rows, zones: [{id,name,col,row,colSpan,rowSpan,allowed_modules}]}
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ─── publish_log ─────────────────────────────────────────────
-- Logg over alle publiseringshandlinger. Brukes for angre/rollback.
-- snapshot er en kopi av content_items-raden på tidspunktet.
CREATE TABLE IF NOT EXISTS publish_log (
  id               uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id  uuid    REFERENCES content_items(id) ON DELETE SET NULL,
  action           text    NOT NULL,            -- 'published' | 'unpublished' | 'approved' | 'rejected' | 'scheduled' | 'rolled_back'
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

-- module_registry: lese-tilgang for alle autentiserte, skriv kun super_admin
CREATE POLICY "module_registry_read" ON module_registry
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "module_registry_admin" ON module_registry
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'super_admin')
  );

-- tenant_modules: tenant ser og endrer egne rader
CREATE POLICY "tenant_modules_tenant" ON tenant_modules
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- zone_layouts: tenant ser og endrer egne rader
CREATE POLICY "zone_layouts_tenant" ON zone_layouts
  FOR ALL USING (tenant_id = get_my_tenant_id());

-- publish_log: tenant ser egne logg-rader
CREATE POLICY "publish_log_tenant" ON publish_log
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

-- Intern info
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

-- Salg/tilbud
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

-- Informasjon
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

-- Media
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

-- ═══════════════════════════════════════════════════════════════
-- SEED: Standard zone-layouts (3 universelle layouts)
-- Tenant-ID og chain-ID er NULL her — kopieres per tenant ved onboarding.
-- For Gange-Rolv (demo-tenant) lager vi layouts i applikasjonskoden ved behov.
-- ═══════════════════════════════════════════════════════════════

-- Layoutene lagres ikke med tenant_id her siden vi ikke vet UUID-en.
-- Se src/lib/admin/zone-layouts.ts for seed-hjelper-funksjoner.
```

- [ ] **Steg 2: Verifiser at migrasjonsfilen er syntaktisk korrekt**

```bash
grep -c "CREATE TABLE\|INSERT INTO\|ALTER TABLE" /Users/frlund3/Documents/GitHub/infoskjerm/supabase/migrations/002_module_registry.sql
```

Forventet: `8` (3 CREATE TABLE + 1 ALTER TABLE + 4 INSERT INTO-blokker)

- [ ] **Steg 3: Kjør migrasjonen via Supabase MCP**

Bruk Supabase MCP-verktøyet:
```
mcp__claude_ai_Supabase__apply_migration({
  project_id: "fcxwrfmdvfjulhoebceq",
  name: "002_module_registry",
  query: <innhold fra 002_module_registry.sql>
})
```

- [ ] **Steg 4: Verifiser at tabellene ble opprettet**

```
mcp__claude_ai_Supabase__execute_sql({
  project_id: "fcxwrfmdvfjulhoebceq",
  query: "SELECT key, name, category FROM module_registry ORDER BY category, key;"
})
```

Forventet: 12 rader.

- [ ] **Steg 5: Regenerer TypeScript-typer**

```
mcp__claude_ai_Supabase__generate_typescript_types({
  project_id: "fcxwrfmdvfjulhoebceq"
})
```

Kopier output til `src/types/database.ts` (erstatt hele filen).

- [ ] **Steg 6: Commit migrasjonen og oppdaterte typer**

```bash
git add supabase/migrations/002_module_registry.sql src/types/database.ts
git commit -m "feat: modul-register, zone-layouts og publish-logg tabeller"
```

---

## Task 2: Query-lag for moduler (testbart)

**Filer:**
- Opprett: `src/lib/admin/modules.ts`
- Opprett: `src/lib/admin/modules.test.ts`

- [ ] **Steg 1: Skriv failing test**

Opprett `src/lib/admin/modules.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { groupModulesByCategory, formatModuleCategory } from './modules'

describe('formatModuleCategory', () => {
  it('formatter intern_info korrekt', () => {
    expect(formatModuleCategory('intern_info')).toBe('Intern info')
  })

  it('formatter salg_tilbud korrekt', () => {
    expect(formatModuleCategory('salg_tilbud')).toBe('Salg & tilbud')
  })

  it('formatter informasjon korrekt', () => {
    expect(formatModuleCategory('informasjon')).toBe('Informasjon')
  })

  it('formatter media korrekt', () => {
    expect(formatModuleCategory('media')).toBe('Media')
  })

  it('returnerer raw-verdi for ukjente kategorier', () => {
    expect(formatModuleCategory('ukjent')).toBe('ukjent')
  })
})

describe('groupModulesByCategory', () => {
  const mockModules = [
    { key: 'a', category: 'intern_info', name: 'A', description: null, icon: 'box', is_active: true, id: '1', created_at: null, schema: {} },
    { key: 'b', category: 'media', name: 'B', description: null, icon: 'box', is_active: true, id: '2', created_at: null, schema: {} },
    { key: 'c', category: 'intern_info', name: 'C', description: null, icon: 'box', is_active: false, id: '3', created_at: null, schema: {} },
  ]

  it('grupperer moduler på riktig kategori', () => {
    const groups = groupModulesByCategory(mockModules)
    expect(groups['intern_info']).toHaveLength(2)
    expect(groups['media']).toHaveLength(1)
  })

  it('filtrerer bort inaktive moduler når active-only er true', () => {
    const groups = groupModulesByCategory(mockModules, true)
    expect(groups['intern_info']).toHaveLength(1)
  })
})
```

- [ ] **Steg 2: Kjør test — verifiser at den feiler**

```bash
npm run test:run
```

Forventet: FAIL — `formatModuleCategory` ikke definert.

- [ ] **Steg 3: Opprett `src/lib/admin/modules.ts`**

```ts
import type { AdminSupabase } from './queries'
import type { Database } from '@/types/database'

export type ModuleRow = Database['public']['Tables']['module_registry']['Row']
export type TenantModuleRow = Database['public']['Tables']['tenant_modules']['Row']

// ─── Hjelpefunksjoner ────────────────────────────────────────────────────────

const categoryLabels: Record<string, string> = {
  intern_info:   'Intern info',
  salg_tilbud:   'Salg & tilbud',
  informasjon:   'Informasjon',
  media:         'Media',
  underholdning: 'Underholdning',
}

export function formatModuleCategory(category: string): string {
  return categoryLabels[category] ?? category
}

export function groupModulesByCategory(
  modules: ModuleRow[],
  activeOnly = false
): Record<string, ModuleRow[]> {
  const filtered = activeOnly ? modules.filter((m) => m.is_active) : modules
  return filtered.reduce<Record<string, ModuleRow[]>>((acc, mod) => {
    if (!acc[mod.category]) acc[mod.category] = []
    acc[mod.category].push(mod)
    return acc
  }, {})
}

export const categoryOrder = ['intern_info', 'salg_tilbud', 'informasjon', 'media', 'underholdning']

// ─── Supabase-spørringer ─────────────────────────────────────────────────────

export async function getAllModules(supabase: AdminSupabase): Promise<ModuleRow[]> {
  const { data } = await supabase
    .from('module_registry')
    .select('*')
    .order('category')
    .order('name')

  return data ?? []
}

export async function getEnabledModuleKeys(supabase: AdminSupabase, tenantId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('tenant_modules')
    .select('module_key')
    .eq('tenant_id', tenantId)

  return new Set((data ?? []).map((r) => r.module_key))
}

export async function toggleTenantModule(
  supabase: AdminSupabase,
  tenantId: string,
  moduleKey: string,
  enabledBy: string,
  enabled: boolean
): Promise<void> {
  if (enabled) {
    await supabase
      .from('tenant_modules')
      .upsert({ tenant_id: tenantId, module_key: moduleKey, enabled_by: enabledBy })
  } else {
    await supabase
      .from('tenant_modules')
      .delete()
      .match({ tenant_id: tenantId, module_key: moduleKey })
  }
}
```

- [ ] **Steg 4: Kjør test — verifiser at alle passerer**

```bash
npm run test:run
```

Forventet: 8 tester PASS (5 eksisterende fra queries + 5 nye for modules... vent, det ble 9+5=14. Sjekk at alt er grønt).

- [ ] **Steg 5: Commit**

```bash
git add src/lib/admin/modules.ts src/lib/admin/modules.test.ts
git commit -m "feat: modul-register query-lag med gruppering og tenant-toggle"
```

---

## Task 3: Admin-side for modul-register (`/admin/modules`)

**Filer:**
- Opprett: `src/app/admin/modules/page.tsx`
- Opprett: `src/app/admin/modules/_components/module-card.tsx`
- Opprett: `src/app/admin/modules/_components/module-toggle.tsx`

- [ ] **Steg 1: Opprett `src/app/admin/modules/_components/module-toggle.tsx`**

```tsx
"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { toggleTenantModule } from "@/lib/admin/modules"

interface ModuleToggleProps {
  moduleKey: string
  tenantId: string
  userId: string
  initialEnabled: boolean
}

export function ModuleToggle({ moduleKey, tenantId, userId, initialEnabled }: ModuleToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const supabase = createClient()
    await toggleTenantModule(supabase, tenantId, moduleKey, userId, !enabled)
    setEnabled((prev) => !prev)
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
        enabled ? "focus:ring-[var(--brand-primary)]" : "focus:ring-zinc-400"
      }`}
      style={enabled ? { backgroundColor: "var(--brand-primary)" } : { backgroundColor: "#d4d4d8" }}
      role="switch"
      aria-checked={enabled}
      aria-label={`${enabled ? "Deaktiver" : "Aktiver"} modul`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  )
}
```

- [ ] **Steg 2: Opprett `src/app/admin/modules/_components/module-card.tsx`**

```tsx
import { ModuleToggle } from "./module-toggle"

interface ModuleCardProps {
  moduleKey: string
  name: string
  description: string | null
  icon: string
  isEnabled: boolean
  tenantId: string
  userId: string
  isAdmin: boolean
}

// Enkel ikon-mapping uten ekstern avhengighet
const iconBgColors: Record<string, string> = {
  intern_info:   "bg-blue-50 text-blue-600",
  salg_tilbud:   "bg-orange-50 text-orange-600",
  informasjon:   "bg-violet-50 text-violet-600",
  media:         "bg-pink-50 text-pink-600",
  underholdning: "bg-amber-50 text-amber-600",
}

export function ModuleCard({
  moduleKey, name, description, isEnabled, tenantId, userId, isAdmin,
}: ModuleCardProps) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-all ${
      isEnabled ? "border-zinc-200 shadow-sm" : "border-zinc-100 opacity-60"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={`text-sm font-semibold ${isEnabled ? "text-zinc-900" : "text-zinc-400"}`}>
            {name}
          </p>
          {isAdmin && (
            <ModuleToggle
              moduleKey={moduleKey}
              tenantId={tenantId}
              userId={userId}
              initialEnabled={isEnabled}
            />
          )}
        </div>
        {description && (
          <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
        )}
        <p className={`text-[10px] font-mono mt-2 px-1.5 py-0.5 rounded inline-block ${
          isEnabled ? "bg-emerald-50 text-emerald-600" : "bg-zinc-100 text-zinc-400"
        }`}>
          {moduleKey}
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Steg 3: Opprett `src/app/admin/modules/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getAllModules, getEnabledModuleKeys, groupModulesByCategory, formatModuleCategory, categoryOrder } from "@/lib/admin/modules"
import { ModuleCard } from "./_components/module-card"
import { Layers } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ModulesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  const tenantId = profile?.tenant_id ?? ""
  const isAdmin = role === "super_admin" || role === "chain_manager"

  const [modules, enabledKeys] = await Promise.all([
    getAllModules(supabase),
    getEnabledModuleKeys(supabase, tenantId),
  ])

  const grouped = groupModulesByCategory(modules)
  const enabledCount = modules.filter((m) => enabledKeys.has(m.key)).length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Modul-register"
        subtitle={`${enabledCount} av ${modules.length} moduler aktivert`}
      />

      <div className="flex-1 p-6">
        {modules.length === 0 && (
          <div className="text-center py-16">
            <Layers className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
            <p className="text-zinc-500 font-medium">Ingen moduler funnet</p>
            <p className="text-sm text-zinc-400 mt-1">Kontakt super-admin for å aktivere moduler.</p>
          </div>
        )}

        <div className="space-y-8">
          {categoryOrder
            .filter((cat) => grouped[cat]?.length > 0)
            .map((category) => (
              <section key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-sm font-semibold text-zinc-900">{formatModuleCategory(category)}</h2>
                  <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                    {grouped[category].filter((m) => enabledKeys.has(m.key)).length}/{grouped[category].length} aktivert
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {grouped[category].map((mod) => (
                    <ModuleCard
                      key={mod.key}
                      moduleKey={mod.key}
                      name={mod.name}
                      description={mod.description}
                      icon={mod.icon}
                      isEnabled={enabledKeys.has(mod.key)}
                      tenantId={tenantId}
                      userId={user.id}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              </section>
            ))}
        </div>

        {!isAdmin && (
          <p className="text-xs text-zinc-400 mt-8 text-center">
            Kontakt kjedeansvarlig for å aktivere eller deaktivere moduler.
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Steg 4: Legg til "Moduler" i sidebar-navigasjonen**

I `src/components/admin/sidebar.tsx`, finn `navGroups`-konstanten og legg til i "Innhold"-gruppen:

```tsx
{ href: "/admin/modules", label: "Moduler", icon: Layers, roles: ["super_admin", "chain_manager"] },
```

Legg det til som første item i "Innhold"-gruppen (over "Nyheter").

**OBS:** `Layers` er allerede importert i sidebar.tsx (brukes i logoen). Ingen ny import nødvendig.

- [ ] **Steg 5: TypeScript-sjekk**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Forventet: Ingen feil. Vanlig issue: `database.ts` mangler de nye tabellene ennå (gjøres i Task 1 steg 5). Hvis det er feil relatert til `module_registry` / `tenant_modules` som ikke finnes i types, betyr det at Task 1 steg 5 ikke er gjort ennå.

- [ ] **Steg 6: Commit**

```bash
git add src/app/admin/modules/ src/components/admin/sidebar.tsx
git commit -m "feat: modul-register admin-side med aktivering/deaktivering per tenant"
```

---

## Task 4: Final build + verifisering

- [ ] **Steg 1: Kjør alle tester**

```bash
npm run test:run
```

Forventet: Alle tester grønne (9 fra Sprint 1 + 5 nye = 14 tester).

- [ ] **Steg 2: Kjør produksjonsbygg**

```bash
npm run build 2>&1 | tail -20
```

Forventet: `✓ Compiled successfully` med `/admin/modules` som ny dynamisk rute.

- [ ] **Steg 3: Verifiser modul-seed via Supabase**

```
mcp__claude_ai_Supabase__execute_sql({
  project_id: "fcxwrfmdvfjulhoebceq",
  query: "SELECT key, name, category, is_active FROM module_registry ORDER BY category, name;"
})
```

Forventet: 12 rader med alle modulene.

- [ ] **Steg 4: Final commit**

```bash
git add -A
git commit -m "feat: Sprint 2 komplett — modul-register, zone-layouts, publish-logg"
```

---

## Sprint 3 — Neste

Fil opprettes ved sprint 3-start:
`docs/superpowers/plans/2026-06-28-sprint-3-innholdsbygger.md`

**Forutsetning:** Sprint 2 ferdig + TypeScript-typer inkluderer `module_registry`, `tenant_modules`, `zone_layouts`, `publish_log`.
