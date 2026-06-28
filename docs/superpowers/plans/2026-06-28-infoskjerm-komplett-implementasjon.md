# Infoskjerm — Komplett Implementasjonsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gjøre infoskjerm-plattformen produksjonsklar — fra mock-data til ekte skjermvisning, fungerende opplasting, vær-API, varsler og fullstendig seed-data.

**Architecture:** Next.js 16 App Router med Supabase backend (PostgreSQL + Storage + Realtime). Admin-UI er Server Components med `"use server"` actions. Skjermene er client-side React med polling mot egne API-ruter. Alle tabeller er multi-tenant med RLS.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL, Storage, Realtime), Tailwind CSS v4, pnpm, Playwright E2E, Resend (epost), Yr.no API (vær)

**Supabase project:** `fcxwrfmdvfjulhoebceq`
**Repo:** `/Users/frlund3/Documents/GitHub/infoskjerm`

---

## Filstruktur — nye og endrede filer

```
ENDRE:
  src/components/screen/screen-display.tsx          Erstatt demoSlides med ekte DB-innhold + polling
  src/app/api/screens/[id]/current-content/route.ts Returner full playlist med body/fields
  src/components/modules/weather-module.tsx          Hent fra /api/weather i stedet for stub
  src/app/admin/screens/page.tsx                     Koble til useScreenStatuses realtime hook
  src/app/admin/publish/actions.ts                   Legg til Resend-varsling ved innsending
  src/lib/builder/autosave.ts                        Bruk innholdstype fra state, ikke hardkodet 'slide'

OPPRETT:
  supabase/migrations/008_storage_media.sql          Opprett media-bucket + RLS
  supabase/migrations/009_seed_full.sql              Fullstendig seed-data for alle tabeller
  src/app/api/weather/route.ts                       Proxy til Yr.no med 1-times cache
  src/app/api/screens/[id]/playlist/route.ts         Hent full spilleliste for skjerm
  src/app/admin/content/new/page.tsx                 Velg type + tittel før builder
  src/app/admin/content/new/actions.ts               createContentItem server action
  src/app/admin/content/_components/bulk-approve-bar.tsx  Velg og godkjenn flere
  src/app/admin/publish/actions.ts                   Legg til bulkApproveContent
  src/app/admin/screens/_components/screens-realtime-wrapper.tsx  Koble realtime-hook
```

---

## FASE 1 — KRITISK: Skjermen viser ekte innhold

### Task 1: Oppdater `/api/screens/[id]/current-content` til å returnere spilleliste

**Files:**
- Modify: `src/app/api/screens/[id]/current-content/route.ts`

Nåværende API returnerer kun metadata for ett innhold. Skjermen trenger en ordnet liste av slides med `moduleKey` og `fields`.

- [ ] **Step 1: Skriv E2E-test som feiler**

Legg til i `e2e/04-screens.spec.ts`:
```typescript
test("current-content API returnerer slides-array for en skjerm med spilleliste", async ({ request }) => {
  // Testen forventer at API returnerer { slides: Array<{id, moduleKey, fields, durationSeconds}> }
  // Den vil feile til vi implementerer det
  const res = await request.get("http://localhost:3000/api/screens/TEST_ID/current-content", {
    headers: { Authorization: "Bearer TEST_TOKEN" }
  })
  expect(res.status()).toBe(200)
  const json = await res.json()
  expect(json).toHaveProperty("slides")
  expect(Array.isArray(json.slides)).toBe(true)
})
```

- [ ] **Step 2: Kjør testen — den skal feile**

```bash
cd /Users/frlund3/Documents/GitHub/infoskjerm
pnpm exec playwright test e2e/04-screens.spec.ts --grep "current-content API" 2>&1 | tail -20
```
Forventet: FAIL fordi API ikke returnerer `slides`.

- [ ] **Step 3: Erstatt `route.ts` med ny implementasjon**

```typescript
// src/app/api/screens/[id]/current-content/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export interface Slide {
  id: string
  contentItemId: string
  moduleKey: string
  fields: Record<string, unknown>
  durationSeconds: number
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? null
  const supabase = await createClient()

  const { data: screen } = await supabase
    .from("screens")
    .select("id, token, store_id, stores(chain_id)")
    .eq("id", id)
    .single()

  if (!screen) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: { user } } = await supabase.auth.getUser()
  const hasValidToken = token !== null && (screen as { token?: string | null }).token === token
  const hasAdminSession = !!user

  if (!hasValidToken && !hasAdminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 1. Sjekk om skjermen har en spilleliste
  const { data: screenPlaylists } = await supabase
    .from("screen_playlists")
    .select("playlist_id, priority")
    .eq("screen_id", id)
    .order("priority", { ascending: false })
    .limit(1)

  if (screenPlaylists && screenPlaylists.length > 0) {
    const playlistId = screenPlaylists[0].playlist_id
    const { data: items } = await supabase
      .from("playlist_items")
      .select(`
        id,
        position,
        duration_seconds,
        content_items(id, title, module_key, body, status)
      `)
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true })

    const slides: Slide[] = []
    for (const item of items ?? []) {
      const ci = item.content_items as {
        id: string; title: string; module_key: string | null;
        body: { builder_v1?: { placements?: Array<{ id: string; moduleKey: string; fields: Record<string, unknown>; durationSeconds: number }> } } | null;
        status: string | null
      } | null
      if (!ci || ci.status !== "live") continue

      const placements = ci.body?.builder_v1?.placements ?? []
      if (placements.length > 0) {
        for (const p of placements) {
          slides.push({
            id: p.id,
            contentItemId: ci.id,
            moduleKey: p.moduleKey,
            fields: p.fields,
            durationSeconds: p.durationSeconds,
          })
        }
      } else if (ci.module_key) {
        // Gammelt format: module_key + body direkte
        slides.push({
          id: item.id,
          contentItemId: ci.id,
          moduleKey: ci.module_key,
          fields: (ci.body as Record<string, unknown>) ?? {},
          durationSeconds: item.duration_seconds,
        })
      }
    }
    return NextResponse.json({ slides })
  }

  // 2. Fallback: direkte content_targets for denne skjermen
  const storeId = screen.store_id
  const chainId = (screen.stores as { chain_id: string } | null)?.chain_id ?? null

  const { data: targets } = await supabase
    .from("content_targets")
    .select(`
      content_item_id,
      target_all, chain_id, store_id,
      content_items!inner(id, title, module_key, body, status)
    `)
    .eq("content_items.status", "live")
    .order("content_item_id", { ascending: false })
    .limit(10)

  type Target = {
    content_item_id: string; target_all: boolean | null;
    chain_id: string | null; store_id: string | null;
    content_items: { id: string; title: string; module_key: string | null; body: Record<string, unknown> | null; status: string | null }
  }

  const matching = (targets as unknown as Target[]).filter(t =>
    t.target_all ||
    (t.store_id && t.store_id === storeId) ||
    (t.chain_id && t.chain_id === chainId)
  )

  const slides: Slide[] = []
  for (const t of matching) {
    const ci = t.content_items
    const placements = (ci.body as { builder_v1?: { placements?: Array<{ id: string; moduleKey: string; fields: Record<string, unknown>; durationSeconds: number }> } } | null)?.builder_v1?.placements ?? []
    if (placements.length > 0) {
      for (const p of placements) {
        slides.push({ id: p.id, contentItemId: ci.id, moduleKey: p.moduleKey, fields: p.fields, durationSeconds: p.durationSeconds })
      }
    } else if (ci.module_key) {
      slides.push({ id: ci.id, contentItemId: ci.id, moduleKey: ci.module_key, fields: ci.body ?? {}, durationSeconds: 15 })
    }
  }

  return NextResponse.json({ slides })
}
```

- [ ] **Step 4: Erstatt `screen-display.tsx` med ekte datahenging**

```typescript
// src/components/screen/screen-display.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { ModuleRenderer } from "@/components/modules/module-renderer"
import type { Slide } from "@/app/api/screens/[id]/current-content/route"

const POLL_INTERVAL_MS = 30_000  // Hent oppdatert innhold hvert 30. sek
const COMMAND_POLL_MS = 15_000   // Sjekk kommandoer hvert 15. sek

function ClockSlide() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"]
  const months = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "desember"]
  return (
    <div className="flex flex-col items-center justify-center h-full text-white">
      <div className="mb-8">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-900/50">
          <span className="text-4xl font-bold text-white">GR</span>
        </div>
        <p className="text-center text-zinc-400 text-lg font-medium tracking-wide">Gange-Rolv</p>
      </div>
      <p className="text-9xl font-black tabular-nums tracking-tighter text-white">
        {time.getHours().toString().padStart(2, "0")}
        <span className="animate-pulse">:</span>
        {time.getMinutes().toString().padStart(2, "0")}
      </p>
      <p className="text-2xl text-zinc-400 mt-4 font-light">
        {days[time.getDay()]}, {time.getDate()}. {months[time.getMonth()]} {time.getFullYear()}
      </p>
    </div>
  )
}

function ScreenClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="text-zinc-400 text-sm tabular-nums">
      {time.getHours().toString().padStart(2, "0")}:{time.getMinutes().toString().padStart(2, "0")}
    </span>
  )
}

const CLOCK_SLIDE: Slide = {
  id: "__clock__",
  contentItemId: "__clock__",
  moduleKey: "__clock__",
  fields: {},
  durationSeconds: 10,
}

export function ScreenDisplay({
  token,
  screenId,
}: {
  token: string
  screenId?: string
  storeId?: string
}) {
  const [slides, setSlides] = useState<Slide[]>([CLOCK_SLIDE])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isPoweredOff, setIsPoweredOff] = useState(false)

  // Hent innhold fra API
  const fetchContent = useCallback(async () => {
    if (!screenId) return
    try {
      const res = await fetch(`/api/screens/${screenId}/current-content`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const json = await res.json() as { slides?: Slide[] }
      if (json.slides && json.slides.length > 0) {
        setSlides([CLOCK_SLIDE, ...json.slides])
        setCurrentIndex(0)
      }
    } catch {
      // Bruk eksisterende slides ved nettverksfeil
    }
  }, [screenId, token])

  // Polling for kommandoer
  const pollCommands = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`/api/screens/poll?token=${encodeURIComponent(token)}`)
      if (!res.ok) return
      const json = await res.json() as { command?: string }
      if (json.command === "reload") {
        window.location.reload()
      } else if (json.command === "power_off") {
        setIsPoweredOff(true)
      } else if (json.command === "power_on") {
        setIsPoweredOff(false)
      } else if (json.command === "reboot") {
        window.location.reload()
      }
    } catch {
      // Ignorer nettverksfeil
    }
  }, [token])

  useEffect(() => {
    fetchContent()
    const contentTimer = setInterval(fetchContent, POLL_INTERVAL_MS)
    return () => clearInterval(contentTimer)
  }, [fetchContent])

  useEffect(() => {
    pollCommands()
    const cmdTimer = setInterval(pollCommands, COMMAND_POLL_MS)
    return () => clearInterval(cmdTimer)
  }, [pollCommands])

  // Slide-rotasjon
  useEffect(() => {
    if (slides.length === 0) return
    const slide = slides[currentIndex % slides.length]
    const duration = (slide.durationSeconds ?? 10) * 1000
    const timer = setTimeout(() => {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length)
        setIsTransitioning(false)
      }, 500)
    }, duration)
    return () => clearTimeout(timer)
  }, [currentIndex, slides])

  if (isPoweredOff) {
    return <div className="w-screen h-screen bg-black" />
  }

  const slide = slides[currentIndex % slides.length]

  return (
    <div className="w-screen h-screen bg-zinc-950 overflow-hidden relative" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950" />
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative z-10 h-full transition-opacity duration-500" style={{ opacity: isTransitioning ? 0 : 1 }}>
        {slide.moduleKey === "__clock__" ? (
          <ClockSlide />
        ) : (
          <ModuleRenderer moduleKey={slide.moduleKey} fields={slide.fields} />
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-10 py-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-emerald-500 flex items-center justify-center">
            <span className="text-white text-[10px] font-black">GR</span>
          </div>
          <span className="text-zinc-400 text-sm font-medium">Gange-Rolv</span>
        </div>
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${i === currentIndex % slides.length ? "w-6 h-2 bg-white" : "w-2 h-2 bg-zinc-600"}`}
            />
          ))}
        </div>
        <ScreenClock />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Legg til screen poll API-rute**

```typescript
// src/app/api/screens/poll/route.ts
import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) return NextResponse.json({ command: null })

  const supabase = await createClient()
  const { data: screen } = await supabase
    .from("screens")
    .select("id, pending_command")
    .eq("token", token)
    .single()

  if (!screen) return NextResponse.json({ command: null })

  const command = screen.pending_command

  // Kvitter kommandoen etter at den er lest
  if (command) {
    await supabase
      .from("screens")
      .update({ pending_command: null, last_seen_at: new Date().toISOString() })
      .eq("id", screen.id)
  } else {
    // Oppdater last_seen_at uten kommando
    await supabase
      .from("screens")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", screen.id)
  }

  return NextResponse.json({ command: command ?? null })
}
```

- [ ] **Step 6: Commit**

```bash
cd /Users/frlund3/Documents/GitHub/infoskjerm
git add src/components/screen/screen-display.tsx \
        src/app/api/screens/\[id\]/current-content/route.ts \
        src/app/api/screens/poll/route.ts
git commit -m "feat: screen-display henter ekte innhold fra DB og poller kommandoer"
```

---

## FASE 2 — KRITISK: Supabase Storage for bildeopplasting

### Task 2: Opprett media-bucket og RLS-policies

**Files:**
- Create: `supabase/migrations/008_storage_media.sql`

`MediaUploader`-komponenten er allerede implementert og bruker Supabase Storage. Bucketen `media` mangler bare.

- [ ] **Step 1: Skriv migrasjonsfilen**

```sql
-- supabase/migrations/008_storage_media.sql
-- Opprett media-storage-bucket for bildeopplasting
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,           -- Offentlig tilgang til publiserte bilder
  52428800,       -- 50 MB maks
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
  USING (bucket_id = 'media' AND auth.uid()::text = owner);
```

- [ ] **Step 2: Kjør migrasjonen**

```bash
cd /Users/frlund3/Documents/GitHub/infoskjerm
npx supabase db push --project-ref fcxwrfmdvfjulhoebceq
```

Forventet output: `Applying migration 008_storage_media...` uten feil.

- [ ] **Step 3: Verifiser at bucket eksisterer**

```bash
npx supabase storage ls --project-ref fcxwrfmdvfjulhoebceq
```

Forventet: `media` bucket i listen.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/008_storage_media.sql
git commit -m "feat: opprett Supabase Storage media-bucket med RLS-policies"
```

---

## FASE 3 — HØY: Vær-modul med Yr.no API

### Task 3: Proxy-rute for Yr.no Locationforecast 2.0

**Files:**
- Create: `src/app/api/weather/route.ts`
- Modify: `src/components/modules/weather-module.tsx`

Yr.no krever `User-Agent`-header og caching. Vi proxyer via Next.js route med `revalidate`.

- [ ] **Step 1: Skriv test for API-ruten**

Legg til i `e2e/04-screens.spec.ts`:
```typescript
test("værvarselet API returnerer data for Ålesund", async ({ request }) => {
  const res = await request.get("http://localhost:3000/api/weather?lat=62.47&lon=6.15")
  expect(res.status()).toBe(200)
  const json = await res.json()
  expect(json).toHaveProperty("current")
  expect(json.current).toHaveProperty("temperature")
  expect(json).toHaveProperty("forecast")
  expect(Array.isArray(json.forecast)).toBe(true)
})
```

- [ ] **Step 2: Kjør test — den skal feile**

```bash
pnpm exec playwright test e2e/04-screens.spec.ts --grep "værvarselet API" 2>&1 | tail -10
```
Forventet: FAIL (404 — ruten finnes ikke).

- [ ] **Step 3: Opprett API-rute**

```typescript
// src/app/api/weather/route.ts
import { NextRequest, NextResponse } from "next/server"

export const revalidate = 3600 // Cache 1 time — Yr.no krever dette

interface YrTimeseries {
  time: string
  data: {
    instant: { details: { air_temperature: number; wind_speed: number; relative_humidity: number } }
    next_1_hours?: { summary: { symbol_code: string } }
    next_6_hours?: { summary: { symbol_code: string }; details: { precipitation_amount: number } }
  }
}

export interface WeatherData {
  current: {
    temperature: number
    windSpeed: number
    humidity: number
    symbolCode: string
    locationName: string
  }
  forecast: Array<{
    date: string
    high: number
    low: number
    symbolCode: string
    precipitation: number
  }>
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const lat = req.nextUrl.searchParams.get("lat")
  const lon = req.nextUrl.searchParams.get("lon")

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat og lon er påkrevd" }, { status: 400 })
  }

  const yrUrl = `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`

  try {
    const res = await fetch(yrUrl, {
      headers: {
        "User-Agent": "infoskjerm/1.0 contact@framtidmedia.no",
        "Accept": "application/json",
      },
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Yr.no svarte ${res.status}` }, { status: 502 })
    }

    const yrData = await res.json() as { properties: { timeseries: YrTimeseries[] } }
    const timeseries = yrData.properties.timeseries

    const now = timeseries[0]
    const current: WeatherData["current"] = {
      temperature: Math.round(now.data.instant.details.air_temperature),
      windSpeed: Math.round(now.data.instant.details.wind_speed * 10) / 10,
      humidity: Math.round(now.data.instant.details.relative_humidity),
      symbolCode: now.data.next_1_hours?.summary.symbol_code ?? "cloudy",
      locationName: "",
    }

    // Daglig prognose for neste 5 dager
    const dailyMap = new Map<string, { highs: number[]; lows: number[]; symbol: string; precip: number[] }>()

    for (const ts of timeseries.slice(0, 120)) {
      const d = ts.time.slice(0, 10)
      if (!dailyMap.has(d)) dailyMap.set(d, { highs: [], lows: [], symbol: "", precip: [] })
      const entry = dailyMap.get(d)!
      const temp = ts.data.instant.details.air_temperature
      entry.highs.push(temp)
      entry.lows.push(temp)
      if (ts.data.next_6_hours) {
        entry.symbol = ts.data.next_6_hours.summary.symbol_code
        entry.precip.push(ts.data.next_6_hours.details.precipitation_amount)
      }
    }

    const today = new Date().toISOString().slice(0, 10)
    const forecast: WeatherData["forecast"] = Array.from(dailyMap.entries())
      .filter(([date]) => date > today)
      .slice(0, 5)
      .map(([date, v]) => ({
        date,
        high: Math.round(Math.max(...v.highs)),
        low: Math.round(Math.min(...v.lows)),
        symbolCode: v.symbol,
        precipitation: Math.round(v.precip.reduce((a, b) => a + b, 0) * 10) / 10,
      }))

    return NextResponse.json({ current, forecast } satisfies WeatherData)
  } catch (err) {
    console.error("Yr.no fetch feilet:", err)
    return NextResponse.json({ error: "Kunne ikke hente værvarselet" }, { status: 502 })
  }
}
```

- [ ] **Step 4: Oppdater `WeatherModule` til å bruke API-ruten**

```typescript
// src/components/modules/weather-module.tsx
"use client"

import { useEffect, useState } from "react"
import { CloudSun, Wind, Droplets, Sun, Cloud, CloudRain, Snowflake } from "lucide-react"
import type { WeatherData } from "@/app/api/weather/route"

const SYMBOL_ICONS: Record<string, React.ElementType> = {
  clearsky_day: Sun,
  fair_day: Sun,
  partlycloudy_day: CloudSun,
  cloudy: Cloud,
  rain: CloudRain,
  heavyrain: CloudRain,
  snow: Snowflake,
  heavysnow: Snowflake,
}

function WeatherIcon({ code, className }: { code: string; className?: string }) {
  const Icon = Object.entries(SYMBOL_ICONS).find(([k]) => code.startsWith(k.split("_")[0]))?.[1] ?? CloudSun
  return <Icon className={className} />
}

const DAY_NO = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"]

interface Props { fields: Record<string, unknown> }

export function WeatherModule({ fields }: Props) {
  const locationName = (fields.location_name as string) || "Stedet"
  const lat = (fields.lat as number) ?? 62.47
  const lon = (fields.lon as number) ?? 6.15
  const [weather, setWeather] = useState<WeatherData | null>(null)

  useEffect(() => {
    fetch(`/api/weather?lat=${lat}&lon=${lon}`)
      .then((r) => r.json())
      .then((d: WeatherData) => setWeather(d))
      .catch(() => {})
  }, [lat, lon])

  if (!weather) {
    return (
      <div className="flex flex-col justify-center h-full px-20 text-white">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
            <CloudSun className="w-7 h-7 text-sky-400 animate-pulse" />
          </div>
          <span className="text-sky-400 font-semibold text-lg uppercase tracking-widest">Vær — {locationName}</span>
        </div>
        <p className="text-9xl font-black">--°</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <WeatherIcon code={weather.current.symbolCode} className="w-7 h-7 text-sky-400" />
        </div>
        <span className="text-sky-400 font-semibold text-lg uppercase tracking-widest">Vær — {locationName}</span>
      </div>
      <div className="flex items-end gap-8 mb-8">
        <p className="text-9xl font-black">{weather.current.temperature}°</p>
        <div className="pb-4">
          <div className="flex gap-6 text-zinc-400">
            <div className="flex items-center gap-2"><Wind className="w-4 h-4" /><span>{weather.current.windSpeed} m/s</span></div>
            <div className="flex items-center gap-2"><Droplets className="w-4 h-4" /><span>{weather.current.humidity}%</span></div>
          </div>
        </div>
      </div>
      <div className="flex gap-6">
        {weather.forecast.map((day) => {
          const d = new Date(day.date)
          return (
            <div key={day.date} className="flex flex-col items-center gap-2 bg-white/5 rounded-2xl px-5 py-4">
              <span className="text-zinc-400 text-sm">{DAY_NO[d.getDay()]}</span>
              <WeatherIcon code={day.symbolCode} className="w-8 h-8 text-sky-300" />
              <span className="text-white font-bold">{day.high}°</span>
              <span className="text-zinc-500 text-sm">{day.low}°</span>
              {day.precipitation > 0 && (
                <span className="text-sky-400 text-xs">{day.precipitation}mm</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/weather/route.ts src/components/modules/weather-module.tsx
git commit -m "feat: værvarselet med Yr.no API — ekte data med 1-times cache"
```

---

## FASE 4 — HØY: Opprett nytt innhold (type + tittel før builder)

### Task 4: `/admin/content/new` med typevalg og serveraction

**Files:**
- Create: `src/app/admin/content/new/page.tsx`
- Create: `src/app/admin/content/new/actions.ts`

Nå kobler alle "Ny X"-knapper til `/admin/builder` uten at brukeren velger type. Riktig flyt: velg type + skriv tittel → opprett draft content_item → åpne builder med `?id=`.

- [ ] **Step 1: Opprett server action**

```typescript
// src/app/admin/content/new/actions.ts
"use server"

import { redirect } from "next/navigation"
import { requireRole } from "@/lib/admin/require-role"

type ContentType = "news" | "competition" | "stats" | "weather" | "slide"

export async function createContentItem(formData: FormData) {
  const { supabase, userId } = await requireRole(["super_admin", "chain_manager", "store_manager"])

  const title = formData.get("title") as string
  const type = formData.get("type") as ContentType

  if (!title?.trim() || !type) {
    throw new Error("Tittel og type er påkrevd")
  }

  const { data: user } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", userId)
    .single()

  if (!user) throw new Error("Bruker ikke funnet")

  const { data: item, error } = await supabase
    .from("content_items")
    .insert({
      title: title.trim(),
      type,
      body: {},
      status: "draft",
      tenant_id: user.tenant_id,
      created_by: userId,
    })
    .select("id")
    .single()

  if (error || !item) throw new Error(error?.message ?? "Kunne ikke opprette innhold")

  redirect(`/admin/builder?id=${item.id}`)
}
```

- [ ] **Step 2: Opprett side**

```typescript
// src/app/admin/content/new/page.tsx
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { createContentItem } from "./actions"
import { Newspaper, Trophy, BarChart2, CloudSun, ImageIcon } from "lucide-react"
import Link from "next/link"

const CONTENT_TYPES = [
  { key: "news", label: "Nyhet", desc: "Intern informasjon, beskjeder og nyheter til ansatte", icon: Newspaper, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { key: "competition", label: "Konkurranse", desc: "Ukens konkurranse med leaderboard og premie", icon: Trophy, color: "bg-amber-50 border-amber-200 text-amber-700" },
  { key: "stats", label: "Salgstall", desc: "Dagsomsetning, budsjett og periodetall", icon: BarChart2, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { key: "weather", label: "Vær", desc: "Lokalvær fra Yr.no med 5-dagers prognose", icon: CloudSun, color: "bg-sky-50 border-sky-200 text-sky-700" },
  { key: "slide", label: "Slide / annet", desc: "Friform-presentasjon med valgfrie moduler", icon: ImageIcon, color: "bg-zinc-50 border-zinc-200 text-zinc-700" },
] as const

export default function NewContentPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Nytt innhold"
        subtitle="Velg type og gi innholdet et navn"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/content/news">Avbryt</Link>
          </Button>
        }
      />
      <div className="flex-1 p-6 max-w-2xl mx-auto w-full">
        <form action={createContentItem} className="space-y-6">
          {/* Tittel */}
          <div>
            <label htmlFor="title" className="block text-sm font-semibold text-zinc-700 mb-2">
              Tittel
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="F.eks. Sommer åpningstider 2026"
              className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          {/* Type */}
          <div>
            <p className="block text-sm font-semibold text-zinc-700 mb-3">Innholdstype</p>
            <div className="grid grid-cols-1 gap-2">
              {CONTENT_TYPES.map((t) => {
                const Icon = t.icon
                return (
                  <label
                    key={t.key}
                    className="flex items-center gap-4 p-4 border-2 border-zinc-100 rounded-xl cursor-pointer hover:border-zinc-300 transition-colors has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50"
                  >
                    <input type="radio" name="type" value={t.key} required className="sr-only" />
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${t.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900 text-sm">{t.label}</p>
                      <p className="text-xs text-zinc-500">{t.desc}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg">
            Opprett og åpne i builder →
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Oppdater "Ny nyhet"-lenker i alle innholdssider til å peke på `/admin/content/new`**

I `src/app/admin/content/news/page.tsx` — endre `href`:
```typescript
// Finn linjen:
<Link href="/admin/builder" className="flex items-center gap-1.5">
// Erstatt med:
<Link href="/admin/content/new" className="flex items-center gap-1.5">
```

Gjør det samme i `competitions/page.tsx`, `stats/page.tsx`, `slides/page.tsx`, `weather/page.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/content/new/
git commit -m "feat: opprette nytt innhold — typevalg + tittel før builder"
```

---

## FASE 5 — MEDIUM: Realtime skjermstatus

### Task 5: Koble `useScreenStatuses` til skjermsiden

**Files:**
- Create: `src/app/admin/screens/_components/screens-realtime-wrapper.tsx`
- Modify: `src/app/admin/screens/page.tsx`

Hooken `src/lib/realtime/screens.ts` eksisterer allerede men er ikke koblet til noe.

- [ ] **Step 1: Opprett realtime wrapper-komponent**

```typescript
// src/app/admin/screens/_components/screens-realtime-wrapper.tsx
"use client"

import { useScreenStatuses } from "@/lib/realtime/screens"
import { ScreenMapClient } from "./screen-map-client"
import type { ComponentProps } from "react"

type ScreenMapProps = ComponentProps<typeof ScreenMapClient>

interface Props extends Omit<ScreenMapProps, "screens"> {
  screens: ScreenMapProps["screens"]
}

export function ScreensRealtimeWrapper({ screens, ...rest }: Props) {
  const statuses = useScreenStatuses(
    screens.map((s) => ({ id: s.id, status: s.status, last_heartbeat: s.last_heartbeat }))
  )

  const screensWithLive = screens.map((s) => {
    const live = statuses.get(s.id)
    if (!live) return s
    return { ...s, status: live.status, last_heartbeat: live.last_heartbeat }
  })

  return <ScreenMapClient screens={screensWithLive} {...rest} />
}
```

- [ ] **Step 2: Erstatt `ScreenMapClient` med wrapper i `screens/page.tsx`**

I `src/app/admin/screens/page.tsx`, finn importen og bruken av `ScreenMapClient` og bytt til `ScreensRealtimeWrapper`:
```typescript
// Endre import:
import { ScreensRealtimeWrapper } from "./_components/screens-realtime-wrapper"

// Endre bruk i JSX — finn <ScreenMapClient ... /> og erstatt med:
<ScreensRealtimeWrapper screens={screens} />
```

- [ ] **Step 3: Legg til Supabase Realtime i `next.config.ts` (hvis mangler)**

Verifiser at `next.config.ts` ikke blokkerer WebSocket. Ingen endring nødvendig — Next.js tunneler WS automatisk.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/screens/_components/screens-realtime-wrapper.tsx \
        src/app/admin/screens/page.tsx
git commit -m "feat: realtime skjermstatus — WebSocket-oppdateringer via Supabase"
```

---

## FASE 6 — MEDIUM: Varsler via Resend

### Task 6: Resend-varsling ved innholdsinnlevering til godkjenning

**Files:**
- Modify: `src/app/admin/publish/actions.ts`

Når en ansatt sender innhold til godkjenning, skal chain_manager/super_admin få e-postvarsling.

- [ ] **Step 1: Sjekk at RESEND_API_KEY er satt**

```bash
cd /Users/frlund3/Documents/GitHub/infoskjerm
grep -r "RESEND" .env.local || echo "Mangler RESEND_API_KEY"
```

Hvis mangler: `gh secret set RESEND_API_KEY --body "<nøkkel>"` og legg til i `.env.local`.

- [ ] **Step 2: Installer Resend SDK**

```bash
pnpm add resend
```

- [ ] **Step 3: Legg til e-postvarsling i `submitForApproval`**

Åpne `src/app/admin/publish/actions.ts` og legg til etter `await supabase.from("publish_log").insert(...)`:

```typescript
// Importer øverst i filen:
import { Resend } from "resend"

// Inne i submitForApproval, etter publish_log.insert:
try {
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data: managers } = await supabase
    .from("users")
    .select("email, full_name")
    .in("role", ["super_admin", "chain_manager"])
    .eq("tenant_id", item.tenant_id)

  if (managers && managers.length > 0) {
    await resend.emails.send({
      from: "Infoskjerm <noreply@framtidmedia.no>",
      to: managers.map((m) => m.email),
      subject: `Nytt innhold venter godkjenning: ${item.title}`,
      html: `
        <p>Hei,</p>
        <p><strong>${item.title}</strong> er sendt til godkjenning.</p>
        <p><a href="https://infoskjerm.vercel.app/admin/publish">Se godkjenningskøen →</a></p>
      `,
    })
  }
} catch (emailErr) {
  // Logg men ikke kast feil — ikke blokker innlevering pga e-postfeil
  console.error("Resend-varsling feilet:", emailErr)
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/publish/actions.ts
git commit -m "feat: Resend e-postvarsling til ledere ved innholdsinnlevering"
```

---

## FASE 7 — MEDIUM: Bulk-godkjenning av innhold

### Task 7: Checkbox + bulk-godkjenn-knapp i innholdslister

**Files:**
- Create: `src/app/admin/content/_components/bulk-approve-bar.tsx`
- Modify: `src/app/admin/content/actions.ts`
- Modify: `src/app/admin/content/news/page.tsx` (og de andre innholdssidene)

- [ ] **Step 1: Legg til `bulkApproveContent` server action**

Legg til i `src/app/admin/content/actions.ts`:
```typescript
export async function bulkApproveContent(ids: string[]) {
  const { supabase, userId } = await requireRole(["super_admin", "chain_manager"])
  if (ids.length === 0) return { ok: false, error: "Ingen valgte" }
  const { error } = await supabase
    .from("content_items")
    .update({ status: "approved", approved_by: userId, updated_at: new Date().toISOString() })
    .in("id", ids)
    .eq("status", "pending_approval")
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/competitions")
  revalidatePath("/admin/content/stats")
  revalidatePath("/admin/publish")
  return { ok: true, count: ids.length }
}
```

- [ ] **Step 2: Opprett `BulkApproveBar`-komponent**

```typescript
// src/app/admin/content/_components/bulk-approve-bar.tsx
"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { bulkApproveContent } from "../actions"
import { toast } from "sonner"

interface BulkApproveBarProps {
  itemIds: string[]
  pendingIds: string[]
}

export function BulkApproveBar({ itemIds, pendingIds }: BulkApproveBarProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  function toggleAll() {
    if (selected.size === pendingIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pendingIds))
    }
  }

  function handleBulkApprove() {
    const ids = Array.from(selected)
    startTransition(async () => {
      const result = await bulkApproveContent(ids)
      if (result.ok) {
        toast.success(`${result.count} innhold godkjent`)
        setSelected(new Set())
      } else {
        toast.error(result.error ?? "Noe gikk galt")
      }
    })
  }

  if (pendingIds.length === 0) return null

  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <input
        type="checkbox"
        checked={selected.size === pendingIds.length && pendingIds.length > 0}
        onChange={toggleAll}
        className="w-4 h-4 rounded"
        aria-label="Velg alle venter-godkjenning"
      />
      <span className="text-sm text-amber-800 font-medium">
        {selected.size > 0 ? `${selected.size} valgt` : `${pendingIds.length} venter godkjenning`}
      </span>
      {selected.size > 0 && (
        <>
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={isPending}
            className="ml-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Godkjenn {selected.size} valgte
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
      {/* Skjulte checkboxer per element — eksponert via data-item-id */}
      <div className="hidden">
        {pendingIds.map((id) => (
          <input
            key={id}
            type="checkbox"
            data-item-id={id}
            checked={selected.has(id)}
            onChange={(e) => {
              setSelected((prev) => {
                const next = new Set(prev)
                if (e.target.checked) next.add(id)
                else next.delete(id)
                return next
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Legg til `BulkApproveBar` i `news/page.tsx`**

```typescript
// I NewsPage, legg til import:
import { BulkApproveBar } from "../_components/bulk-approve-bar"

// I JSX, erstatt den eksisterende amber-banneret med:
{pendingCount > 0 && (
  <BulkApproveBar
    itemIds={news.map((n) => n.id)}
    pendingIds={news.filter((n) => n.status === "pending_approval").map((n) => n.id)}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/content/_components/bulk-approve-bar.tsx \
        src/app/admin/content/actions.ts \
        src/app/admin/content/news/page.tsx
git commit -m "feat: bulk-godkjenning av innhold"
```

---

## FASE 8 — SIST: Fullstendig seed-data

### Task 8: Migrasjon med ekte testdata for alle tabeller

**Files:**
- Create: `supabase/migrations/009_seed_full.sql`

Seed-data gir en realistisk demo-tilstand: skjermer med ulik status, innhold i alle statuser, spillelister, publiseringslogg og brukerroller.

> **NB:** Migrasjonen bruker `INSERT ... ON CONFLICT DO NOTHING` slik at den er idempotent.

- [ ] **Step 1: Hent eksisterende IDs fra databasen**

```bash
npx supabase db execute --project-ref fcxwrfmdvfjulhoebceq \
  --sql "SELECT id, name FROM stores ORDER BY name LIMIT 16;"
```

Kopier IDs — de brukes i seed-dataen under.

- [ ] **Step 2: Skriv migrasjonsfilen**

```sql
-- supabase/migrations/009_seed_full.sql
-- ============================================================
-- Fullstendig seed-data for demo/utvikling
-- Idempotent: INSERT ... ON CONFLICT DO NOTHING
-- Bruker de fastlagde tenant/chain-IDene fra 001_initial_schema.sql
-- ============================================================

-- ─── Hjelpevariabler (konstanter fra eksisterende seed) ───
-- Tenant:  00000000-0000-0000-0000-000000000001
-- EUROSPAR: 00000000-0000-0000-0000-000000000010
-- JOKER:    00000000-0000-0000-0000-000000000011
-- SPAR:     00000000-0000-0000-0000-000000000012

-- ─── Tags på butikker ──────────────────────────────────────
-- Hent tag-IDs dynamisk
DO $$
DECLARE
  tag_sunnmore uuid;
  tag_nordfjord uuid;
  tag_storby uuid;
  tag_oybutikk uuid;
  store_blindheim uuid;
  store_hareid uuid;
  store_moa uuid;
  store_godoy uuid;
  store_ellingsoy uuid;
  store_hornindal uuid;
BEGIN
  SELECT id INTO tag_sunnmore FROM tags WHERE name = 'SUNNMØRE' AND tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO tag_nordfjord FROM tags WHERE name = 'NORDFJORD' AND tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO tag_storby FROM tags WHERE name = 'STORBY' AND tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO tag_oybutikk FROM tags WHERE name = 'ØYBUTIKK' AND tenant_id = '00000000-0000-0000-0000-000000000001' LIMIT 1;

  SELECT id INTO store_blindheim FROM stores WHERE name = 'EUROSPAR BLINDHEIM' LIMIT 1;
  SELECT id INTO store_hareid FROM stores WHERE name = 'EUROSPAR HAREID' LIMIT 1;
  SELECT id INTO store_moa FROM stores WHERE name = 'EUROSPAR MOA' LIMIT 1;
  SELECT id INTO store_godoy FROM stores WHERE name = 'JOKER GODØY' LIMIT 1;
  SELECT id INTO store_ellingsoy FROM stores WHERE name = 'SPAR ELLINGSØY' LIMIT 1;
  SELECT id INTO store_hornindal FROM stores WHERE name = 'SPAR HORNINDAL' LIMIT 1;

  INSERT INTO store_tags (store_id, tag_id) VALUES
    (store_blindheim, tag_sunnmore), (store_blindheim, tag_storby),
    (store_moa, tag_sunnmore), (store_moa, tag_storby),
    (store_hareid, tag_sunnmore),
    (store_godoy, tag_oybutikk), (store_godoy, tag_sunnmore),
    (store_ellingsoy, tag_oybutikk),
    (store_hornindal, tag_nordfjord)
  ON CONFLICT DO NOTHING;
END $$;

-- ─── Screens: én per butikk + noen offline ─────────────────
DO $$
DECLARE
  s record;
  screen_status screen_status;
  hb timestamptz;
BEGIN
  FOR s IN SELECT id, name FROM stores WHERE tenant_id = '00000000-0000-0000-0000-000000000001' LOOP
    -- Varier status: 70% active/online, 20% active/stale, 10% inactive
    IF random() < 0.7 THEN
      screen_status := 'active';
      hb := now() - (random() * interval '2 minutes');
    ELSIF random() < 0.5 THEN
      screen_status := 'active';
      hb := now() - (random() * interval '8 hours');  -- stale
    ELSE
      screen_status := 'inactive';
      hb := now() - interval '2 days';
    END IF;

    INSERT INTO screens (tenant_id, store_id, name, token, status, last_heartbeat, last_seen_at)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      s.id,
      s.name || ' — Skjerm 1',
      'tok-' || encode(digest(s.id::text || 'seed', 'sha256'), 'hex')::text::varchar(32),
      screen_status,
      hb,
      hb
    )
    ON CONFLICT (token) DO NOTHING;
  END LOOP;
END $$;

-- ─── Content items — alle typer og statuser ────────────────
DO $$
DECLARE
  tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  admin_user uuid;
BEGIN
  -- Finn første super_admin bruker for created_by
  SELECT id INTO admin_user FROM users
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND role = 'super_admin' LIMIT 1;

  IF admin_user IS NULL THEN
    -- Ingen admin-bruker ennå — seed-data hoppes over (kjøres igjen etter første innlogging)
    RAISE NOTICE 'Ingen admin-bruker funnet. Innhold-seed hoppes over.';
    RETURN;
  END IF;

  -- Nyheter
  INSERT INTO content_items (tenant_id, type, title, body, status, created_by, published_at, module_key) VALUES
    (tenant_id, 'news', 'Sommerferieåpningstider 2026',
     '{"builder_v1": {"placements": [{"id": "p1", "moduleKey": "internal-news", "fields": {"title": "Sommerferieåpningstider 2026", "body": "Vi minner om at butikken har endrede åpningstider i juli. Hverdager 08:00–20:00, Lørdag 09:00–18:00. God sommer!"}, "durationSeconds": 15}]}}',
     'live', admin_user, now() - interval '2 days', 'internal-news'),

    (tenant_id, 'news', 'Nytt lagerrutine fra 1. august',
     '{"builder_v1": {"placements": [{"id": "p2", "moduleKey": "internal-news", "fields": {"title": "Nytt lagerrutine fra 1. august", "body": "Fra 1. august innfører vi ny rutine for varemottak. Alle leveranser skal nå skannes ved ankomst. Se opplæringsmateriell i pauserommet."}, "durationSeconds": 15}]}}',
     'approved', admin_user, null, 'internal-news'),

    (tenant_id, 'news', 'Medarbeidersamtaler høst 2026',
     '{"builder_v1": {"placements": [{"id": "p3", "moduleKey": "internal-news", "fields": {"title": "Medarbeidersamtaler høst 2026", "body": "Husk at medarbeidersamtaler skal gjennomføres innen 15. oktober. Book tid med din leder."}, "durationSeconds": 12}]}}',
     'pending_approval', admin_user, null, 'internal-news'),

    (tenant_id, 'news', 'Utkast: Julebord-info',
     '{"builder_v1": {"placements": [{"id": "p4", "moduleKey": "internal-news", "fields": {"title": "Julebord 2026", "body": "Mer info kommer snart..."}, "durationSeconds": 12}]}}',
     'draft', admin_user, null, 'internal-news'),

    (tenant_id, 'news', 'Gammelt varsel: Systemvedlikehold',
     '{"builder_v1": {"placements": [{"id": "p5", "moduleKey": "emergency-message", "fields": {"title": "SYSTEMVEDLIKEHOLD", "body": "Kassesystemet vil være nede fredag kl 02:00–04:00.", "severity": "warning"}, "durationSeconds": 10}]}}',
     'archived', admin_user, null, 'emergency-message')
  ON CONFLICT DO NOTHING;

  -- Konkurranser
  INSERT INTO content_items (tenant_id, type, title, body, status, created_by, published_at, module_key) VALUES
    (tenant_id, 'competition', 'Ukens salgskonkurranse — uke 27',
     '{"builder_v1": {"placements": [{"id": "c1", "moduleKey": "competition", "fields": {"title": "Ukens salgskonkurranse", "description": "Hvem selger mest denne uken? Premie: Gavekort 500 kr!", "prize": "Gavekort på 500 kr", "deadline": "Fredag 4. juli", "leaderboard": [{"rank": 1, "name": "Kari N.", "score": 142, "unit": "salg"}, {"rank": 2, "name": "Per O.", "score": 128, "unit": "salg"}, {"rank": 3, "name": "Anne B.", "score": 115, "unit": "salg"}]}, "durationSeconds": 18}]}}',
     'live', admin_user, now() - interval '1 day', 'competition'),

    (tenant_id, 'competition', 'Mersalgskonkurranse — Bakevarer',
     '{"builder_v1": {"placements": [{"id": "c2", "moduleKey": "competition", "fields": {"title": "Mersalg bakevarer", "description": "Den som selger mest bakevarer i juli vinner!", "prize": "2 dagers fri", "deadline": "31. juli"}, "durationSeconds": 18}]}}',
     'approved', admin_user, null, 'competition')
  ON CONFLICT DO NOTHING;

  -- Salgstall
  INSERT INTO content_items (tenant_id, type, title, body, status, created_by, published_at, module_key) VALUES
    (tenant_id, 'stats', 'Salgstall — Dag',
     '{"builder_v1": {"placements": [{"id": "s1", "moduleKey": "sales-stats", "fields": {"title": "Salgstall i dag", "period": "Dag", "target": 95000, "actual": 87400}, "durationSeconds": 12}]}}',
     'live', admin_user, now() - interval '3 hours', 'sales-stats'),

    (tenant_id, 'stats', 'Salgstall — Uke',
     '{"builder_v1": {"placements": [{"id": "s2", "moduleKey": "sales-stats", "fields": {"title": "Salgstall denne uken", "period": "Uke", "target": 665000, "actual": 523800}, "durationSeconds": 12}]}}',
     'live', admin_user, now() - interval '1 hour', 'sales-stats'),

    (tenant_id, 'stats', 'Salgstall — Måned',
     '{"builder_v1": {"placements": [{"id": "s3", "moduleKey": "sales-stats", "fields": {"title": "Salg juni 2026", "period": "Måned", "target": 2850000, "actual": 2634000}, "durationSeconds": 12}]}}',
     'approved', admin_user, null, 'sales-stats')
  ON CONFLICT DO NOTHING;

  -- Vær
  INSERT INTO content_items (tenant_id, type, title, body, status, created_by, published_at, module_key) VALUES
    (tenant_id, 'weather', 'Vær — Ålesund',
     '{"builder_v1": {"placements": [{"id": "w1", "moduleKey": "weather", "fields": {"location_name": "Ålesund", "lat": 62.47, "lon": 6.15}, "durationSeconds": 15}]}}',
     'live', admin_user, now() - interval '12 hours', 'weather'),

    (tenant_id, 'weather', 'Vær — Ørsta',
     '{"builder_v1": {"placements": [{"id": "w2", "moduleKey": "weather", "fields": {"location_name": "Ørsta", "lat": 62.18, "lon": 6.14}, "durationSeconds": 15}]}}',
     'approved', admin_user, null, 'weather')
  ON CONFLICT DO NOTHING;

  -- Slides / custom
  INSERT INTO content_items (tenant_id, type, title, body, status, created_by, published_at, module_key) VALUES
    (tenant_id, 'slide', 'Velkomst-slide',
     '{"builder_v1": {"placements": [{"id": "sl1", "moduleKey": "company-info", "fields": {"company_name": "Gange-Rolv AS", "tagline": "Godt utvalg — nær deg", "founded": "1992", "employees": "180+"}, "durationSeconds": 10}]}}',
     'live', admin_user, now() - interval '5 days', 'company-info'),

    (tenant_id, 'slide', 'Nedtelling til sommeraksjon',
     '{"builder_v1": {"placements": [{"id": "sl2", "moduleKey": "countdown-timer", "fields": {"title": "Sommeraksjon starter om", "target_date": "2026-07-15T08:00:00"}, "durationSeconds": 10}]}}',
     'live', admin_user, now() - interval '1 day', 'countdown-timer')
  ON CONFLICT DO NOTHING;

END $$;

-- ─── Content targets — koble live-innhold til "alle" ───────
DO $$
DECLARE
  item record;
BEGIN
  FOR item IN
    SELECT id FROM content_items
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
    AND status IN ('live', 'approved')
  LOOP
    INSERT INTO content_targets (content_item_id, target_all)
    VALUES (item.id, true)
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ─── Spillelister ──────────────────────────────────────────
DO $$
DECLARE
  playlist_main uuid;
  playlist_promo uuid;
  item_news1 uuid;
  item_comp uuid;
  item_stats1 uuid;
  item_weather uuid;
  item_slide uuid;
  admin_user uuid;
BEGIN
  SELECT id INTO admin_user FROM users
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND role = 'super_admin' LIMIT 1;

  IF admin_user IS NULL THEN RETURN; END IF;

  -- Hent content_item IDs
  SELECT id INTO item_news1 FROM content_items WHERE title = 'Sommerferieåpningstider 2026' LIMIT 1;
  SELECT id INTO item_comp FROM content_items WHERE title = 'Ukens salgskonkurranse — uke 27' LIMIT 1;
  SELECT id INTO item_stats1 FROM content_items WHERE title = 'Salgstall — Dag' LIMIT 1;
  SELECT id INTO item_weather FROM content_items WHERE title = 'Vær — Ålesund' LIMIT 1;
  SELECT id INTO item_slide FROM content_items WHERE title = 'Velkomst-slide' LIMIT 1;

  -- Hovedspilleliste
  INSERT INTO playlists (id, tenant_id, name)
  VALUES ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Hoved-spilleliste')
  ON CONFLICT (id) DO NOTHING;
  playlist_main := '10000000-0000-0000-0000-000000000001';

  -- Promo-spilleliste
  INSERT INTO playlists (id, tenant_id, name)
  VALUES ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Kampanje — Sommer 2026')
  ON CONFLICT (id) DO NOTHING;
  playlist_promo := '10000000-0000-0000-0000-000000000002';

  -- Legg til items i hoved-spilleliste
  INSERT INTO playlist_items (playlist_id, content_item_id, position, duration_seconds) VALUES
    (playlist_main, item_slide, 0, 10),
    (playlist_main, item_news1, 1, 15),
    (playlist_main, item_comp, 2, 18),
    (playlist_main, item_stats1, 3, 12),
    (playlist_main, item_weather, 4, 15)
  ON CONFLICT DO NOTHING;

  -- Knytt hoved-spilleliste til alle aktive skjermer
  INSERT INTO screen_playlists (screen_id, playlist_id, priority)
  SELECT s.id, playlist_main, 1
  FROM screens s
  WHERE s.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND s.status = 'active'
  ON CONFLICT DO NOTHING;

END $$;

-- ─── Publish-logg: historiske handlinger ───────────────────
DO $$
DECLARE
  admin_user uuid;
  item record;
BEGIN
  SELECT id INTO admin_user FROM users
  WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
  AND role = 'super_admin' LIMIT 1;

  IF admin_user IS NULL THEN RETURN; END IF;

  FOR item IN
    SELECT id, title, status FROM content_items
    WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
    AND status = 'live'
  LOOP
    INSERT INTO publish_log (content_item_id, action, performed_by, snapshot, created_at)
    VALUES
      (item.id, 'submitted_for_approval', admin_user, jsonb_build_object('title', item.title, 'status', 'draft'), now() - interval '3 days'),
      (item.id, 'approved', admin_user, jsonb_build_object('title', item.title, 'status', 'pending_approval'), now() - interval '2 days'),
      (item.id, 'published', admin_user, jsonb_build_object('title', item.title, 'status', 'approved'), now() - interval '2 days')
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- ─── Zone layouts ──────────────────────────────────────────
INSERT INTO zone_layouts (tenant_id, name, description, layout, is_default) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Fullskjerm', 'Ett innhold fyller hele skjermen', '{"zones": [{"id": "main", "x": 0, "y": 0, "w": 100, "h": 100}]}', true),
  ('00000000-0000-0000-0000-000000000001', '70/30 høyre', 'Innhold til venstre, sidebar til høyre', '{"zones": [{"id": "main", "x": 0, "y": 0, "w": 70, "h": 100}, {"id": "side", "x": 70, "y": 0, "w": 30, "h": 100}]}', false),
  ('00000000-0000-0000-0000-000000000001', 'Top/bottom delt', 'Innhold øverst, ticker nederst', '{"zones": [{"id": "main", "x": 0, "y": 0, "w": 100, "h": 85}, {"id": "ticker", "x": 0, "y": 85, "w": 100, "h": 15}]}', false)
ON CONFLICT DO NOTHING;
```

- [ ] **Step 3: Kjør migrasjon**

```bash
npx supabase db push --project-ref fcxwrfmdvfjulhoebceq
```

Forventet: `Applying migration 009_seed_full... OK`

- [ ] **Step 4: Verifiser at data er i databasen**

```bash
npx supabase db execute --project-ref fcxwrfmdvfjulhoebceq \
  --sql "SELECT status, count(*) FROM content_items GROUP BY status ORDER BY status;"
```

Forventet output:
```
 status           | count
------------------+-------
 approved         |     5+
 archived         |     1
 draft            |     1
 live             |     7+
 pending_approval |     1
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/009_seed_full.sql
git commit -m "feat: fullstendig seed-data — skjermer, innhold alle statuser, spillelister, logg"
```

---

## FASE 9 — AVSLUTNING: Push og verifisering

### Task 9: Kjør alle tester og push til main

- [ ] **Step 1: Start dev-server**

```bash
cd /Users/frlund3/Documents/GitHub/infoskjerm
pnpm dev &
sleep 8
```

- [ ] **Step 2: Kjør Playwright-tester**

```bash
pnpm exec playwright test --project="Desktop Chrome" 2>&1 | tail -20
```

Forventet: Alle tester grønne.

- [ ] **Step 3: Kjør TypeScript-sjekk**

```bash
pnpm tsc --noEmit 2>&1 | head -40
```

Forventet: Ingen feil.

- [ ] **Step 4: Push til main**

```bash
git push origin main
```

- [ ] **Step 5: Verifiser Vercel-bygg**

Sjekk at nyeste deployment på `main` er `READY` i Vercel-dashboardet.
URL: `https://vercel.com/frank-lundes-projects/infoskjerm`

---

## Sjekkliste — self-review

### Spec coverage
- [x] Kritisk 1: Screen display → ekte innhold — Task 1
- [x] Kritisk 2: Screen polling / kommandoer — Task 1 (poll API)
- [x] Kritisk 3: Bildeopplasting — Task 2
- [x] Kritisk 4: Builder live-preview — allerede riktig implementert, ingen endring nødvendig
- [x] Høy: Yr.no vær — Task 3
- [x] Høy: Opprette nytt innhold — Task 4
- [x] Medium: Realtime skjermstatus — Task 5
- [x] Medium: Resend-varsler — Task 6
- [x] Medium: Bulk-godkjenning — Task 7
- [x] Sist: Seed-data — Task 8

### Kjente mangler som ikke dekkes av denne planen
- Instagram/Google Reviews/RSS — krever egne API-nøkler, designet som fase 3
- Zone-display på skjerm — krever redesign av screen-display, fase 3
- Multitenant onboarding — ingen andre tenants ennå
- Offline-fallback på skjermer (localStorage) — fase 3
