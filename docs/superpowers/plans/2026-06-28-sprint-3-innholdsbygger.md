# Sprint 3: Innholdsbygger MVP — Implementasjonsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Mål:** Drag-and-drop innholdsbygger med live forhåndsvisning fungerer ende-til-ende. Innholdsredaktøren kan dra moduler inn i canvas, fylle inn felt i et schema-drevet skjema, og se resultatet live i en 16:9-skalert forhåndsvisning — og lagre til Supabase som utkast.

**Arkitektur:** Tre-panel layout (palette | canvas | preview). Builder-state lagres i React-state i `BuilderRoot` (client component). Autosave bruker en `useEffect`-basert debounce (30 sek). Modulkomponenter er delt mellom builder-preview og `/screen/[token]`-rendereren via `ModuleRenderer`. Schema-drevet field-editor basert på `module_registry.schema`.

**Tech Stack:** Next.js 16 App Router, React 19, @dnd-kit/core + @dnd-kit/sortable, Supabase SSR+client, Tailwind CSS 4, Vitest

---

## Filstruktur

```
Opprette:
  src/lib/builder/types.ts
  src/lib/builder/field-renderer.tsx
  src/lib/builder/autosave.ts
  src/lib/builder/builder.test.ts
  src/components/modules/module-renderer.tsx
  src/components/modules/internal-news.tsx
  src/components/modules/emergency-message.tsx
  src/components/modules/shift-schedule.tsx
  src/components/modules/employee-spotlight.tsx
  src/components/modules/training-material.tsx
  src/components/modules/product-offer.tsx
  src/components/modules/competition.tsx
  src/components/modules/sales-stats.tsx
  src/components/modules/weather-module.tsx
  src/components/modules/company-info.tsx
  src/components/modules/lunch-menu.tsx
  src/components/modules/slide-module.tsx
  src/app/admin/builder/page.tsx
  src/app/admin/builder/_components/builder-root.tsx
  src/app/admin/builder/_components/module-palette.tsx
  src/app/admin/builder/_components/zone-canvas.tsx
  src/app/admin/builder/_components/field-editor.tsx
  src/app/admin/builder/_components/live-preview.tsx

Modifisere:
  src/components/screen/screen-display.tsx   — bruk ModuleRenderer
  src/components/admin/sidebar.tsx           — legg til "Bygg innhold"
  package.json                               — @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
```

---

### Task 1: Installer @dnd-kit

**Files:** `package.json`

- [ ] Installer avhengigheter
```bash
cd /Users/frlund3/Documents/GitHub/infoskjerm && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
- [ ] Verifiser at package.json inneholder `@dnd-kit/core`
```bash
grep "@dnd-kit" /Users/frlund3/Documents/GitHub/infoskjerm/package.json
```
- [ ] Commit
```bash
cd /Users/frlund3/Documents/GitHub/infoskjerm && git add package.json package-lock.json && git commit -m "chore: legg til @dnd-kit for drag-and-drop"
```

---

### Task 2: Builder-typer og autosave-hook

**Files:**
- Create: `src/lib/builder/types.ts`
- Create: `src/lib/builder/autosave.ts`
- Create: `src/lib/builder/builder.test.ts`

- [ ] Skriv `src/lib/builder/types.ts`:
```ts
export interface ModulePlacement {
  id: string
  moduleKey: string
  moduleName: string
  fields: Record<string, unknown>
  durationSeconds: number
}

export interface BuilderState {
  contentItemId: string | null
  name: string
  placements: ModulePlacement[]
  selectedId: string | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export interface ModuleSchema {
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'select' | 'image' | 'color' | 'date' | 'json' | 'richtext'
    required?: boolean
    options?: string[]
  }>
}
```

- [ ] Skriv `src/lib/builder/autosave.ts`:
```ts
import { useEffect, useRef } from 'react'
import type { ModulePlacement } from './types'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Supabase = SupabaseClient<Database>

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function useAutosave(
  supabase: Supabase,
  name: string,
  placements: ModulePlacement[],
  tenantId: string,
  userId: string,
  contentItemId: string | null,
  onSaved: (id: string) => void,
  onStatus: (status: SaveStatus) => void,
  delayMs = 30_000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      onStatus('saving')
      try {
        const body = { builder_v1: { placements } }
        if (contentItemId) {
          await supabase
            .from('content_items')
            .update({ title: name, body, updated_at: new Date().toISOString() })
            .eq('id', contentItemId)
        } else {
          const { data } = await supabase
            .from('content_items')
            .insert({
              title: name,
              body,
              type: 'slide',
              status: 'draft',
              tenant_id: tenantId,
              created_by: userId,
            })
            .select('id')
            .single()
          if (data) onSaved(data.id)
        }
        onStatus('saved')
      } catch {
        onStatus('error')
      }
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [name, placements, supabase, tenantId, userId, contentItemId, onSaved, onStatus, delayMs])
}
```

- [ ] Skriv `src/lib/builder/builder.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import type { ModulePlacement, BuilderState } from './types'

function addPlacement(state: BuilderState, placement: ModulePlacement): BuilderState {
  return { ...state, placements: [...state.placements, placement] }
}

function removePlacement(state: BuilderState, id: string): BuilderState {
  return { ...state, placements: state.placements.filter((p) => p.id !== id), selectedId: state.selectedId === id ? null : state.selectedId }
}

function updatePlacementFields(state: BuilderState, id: string, fields: Record<string, unknown>): BuilderState {
  return {
    ...state,
    placements: state.placements.map((p) => p.id === id ? { ...p, fields: { ...p.fields, ...fields } } : p),
  }
}

const makePlacement = (id: string): ModulePlacement => ({
  id, moduleKey: 'internal-news', moduleName: 'Interne nyheter', fields: {}, durationSeconds: 10
})

const makeState = (): BuilderState => ({
  contentItemId: null, name: 'Test', placements: [], selectedId: null, saveStatus: 'idle'
})

describe('addPlacement', () => {
  it('legger til plassering i slutten av listen', () => {
    const state = makeState()
    const result = addPlacement(state, makePlacement('a'))
    expect(result.placements).toHaveLength(1)
    expect(result.placements[0].id).toBe('a')
  })
})

describe('removePlacement', () => {
  it('fjerner plassering med riktig id', () => {
    let state = addPlacement(makeState(), makePlacement('a'))
    state = addPlacement(state, makePlacement('b'))
    const result = removePlacement(state, 'a')
    expect(result.placements).toHaveLength(1)
    expect(result.placements[0].id).toBe('b')
  })
  it('nullstiller selectedId hvis valgt modul slettes', () => {
    let state = addPlacement(makeState(), makePlacement('a'))
    state = { ...state, selectedId: 'a' }
    const result = removePlacement(state, 'a')
    expect(result.selectedId).toBeNull()
  })
})

describe('updatePlacementFields', () => {
  it('merger nye felter med eksisterende', () => {
    let state = addPlacement(makeState(), { ...makePlacement('a'), fields: { title: 'Gammel' } })
    const result = updatePlacementFields(state, 'a', { title: 'Ny', body: 'Tekst' })
    expect(result.placements[0].fields).toEqual({ title: 'Ny', body: 'Tekst' })
  })
})
```

- [ ] Kjør tester:
```bash
cd /Users/frlund3/Documents/GitHub/infoskjerm && npm run test:run
```
Expected: 19 tests pass (16 existing + 3 nye)

---

### Task 3: 12 modulkomponenter + ModuleRenderer

**Files:** `src/components/modules/` (13 filer)

- [ ] Opprett `src/components/modules/module-renderer.tsx`:
```tsx
import { InternalNewsModule } from './internal-news'
import { EmergencyMessageModule } from './emergency-message'
import { ShiftScheduleModule } from './shift-schedule'
import { EmployeeSpotlightModule } from './employee-spotlight'
import { TrainingMaterialModule } from './training-material'
import { ProductOfferModule } from './product-offer'
import { CompetitionModule } from './competition'
import { SalesStatsModule } from './sales-stats'
import { WeatherModule } from './weather-module'
import { CompanyInfoModule } from './company-info'
import { LunchMenuModule } from './lunch-menu'
import { SlideModule } from './slide-module'

interface ModuleRendererProps {
  moduleKey: string
  fields: Record<string, unknown>
}

export function ModuleRenderer({ moduleKey, fields }: ModuleRendererProps) {
  switch (moduleKey) {
    case 'internal-news': return <InternalNewsModule fields={fields} />
    case 'emergency-message': return <EmergencyMessageModule fields={fields} />
    case 'shift-schedule': return <ShiftScheduleModule fields={fields} />
    case 'employee-spotlight': return <EmployeeSpotlightModule fields={fields} />
    case 'training-material': return <TrainingMaterialModule fields={fields} />
    case 'product-offer': return <ProductOfferModule fields={fields} />
    case 'competition': return <CompetitionModule fields={fields} />
    case 'sales-stats': return <SalesStatsModule fields={fields} />
    case 'weather': return <WeatherModule fields={fields} />
    case 'company-info': return <CompanyInfoModule fields={fields} />
    case 'lunch-menu': return <LunchMenuModule fields={fields} />
    case 'slide': return <SlideModule fields={fields} />
    default: return (
      <div className="flex items-center justify-center h-full text-zinc-400 text-2xl font-medium">
        Ukjent modul: {moduleKey}
      </div>
    )
  }
}
```

- [ ] Opprett alle 12 modulkomponenter (internal-news.tsx, emergency-message.tsx, shift-schedule.tsx, employee-spotlight.tsx, training-material.tsx, product-offer.tsx, competition.tsx, sales-stats.tsx, weather-module.tsx, company-info.tsx, lunch-menu.tsx, slide-module.tsx)

---

### Task 4: Builder UI-komponenter (field-editor, live-preview)

**Files:**
- Create: `src/lib/builder/field-renderer.tsx`
- Create: `src/app/admin/builder/_components/live-preview.tsx`
- Create: `src/app/admin/builder/_components/field-editor.tsx`

---

### Task 5: ModulePalette, ZoneCanvas, BuilderRoot

**Files:**
- Create: `src/app/admin/builder/_components/module-palette.tsx`
- Create: `src/app/admin/builder/_components/zone-canvas.tsx`
- Create: `src/app/admin/builder/_components/builder-root.tsx`

---

### Task 6: Builder side-page + sidebar-oppdatering

**Files:**
- Create: `src/app/admin/builder/page.tsx`
- Modify: `src/components/admin/sidebar.tsx`

---

### Task 7: Oppdater ScreenDisplay til å bruke ModuleRenderer

Modify `src/components/screen/screen-display.tsx` — replace hardcoded demo slides with ModuleRenderer.

---

### Task 8: Kjør tester, bygg, commit

- [ ] Kjør tester
- [ ] Typesjekk
- [ ] Bygg
- [ ] Commit
