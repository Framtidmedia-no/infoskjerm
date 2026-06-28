# Sprint 1: Designsystem & Ekte Data — Implementasjonsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Mål:** Migrer admin-UI fra mørkt mock-data-tema til lyst merkevare-tema med ekte Supabase-data, rolle-basert navigasjon og live skjermstatus via Supabase Realtime.

**Arkitektur:** Tailwind CSS 4 custom properties injiseres på `<html data-chain="...">` slik at kjedefargen er en runtime CSS-variabel. Alle server components henter data direkte fra Supabase SSR-klient. Skjermstatus abonnerer på Supabase Realtime i en Client Component wrapper.

**Tech Stack:** Next.js 16 App Router, Supabase SSR, Tailwind CSS 4, Supabase Realtime, Vitest, React Testing Library, `@testing-library/jest-dom`

---

## Filstruktur

```
Opprette:
  src/lib/admin/queries.ts          – Alle Supabase-spørringer for admin (testbare funksjoner)
  src/lib/admin/queries.test.ts     – Vitest-tester for queries
  src/lib/realtime/screens.ts       – Supabase Realtime subscription hook
  src/components/admin/screen-status-dot.tsx  – Live status-indikator komponent
  src/components/admin/realtime-screen-grid.tsx – Skjermgrid med live status

Modifisere:
  src/app/globals.css               – Brand color CSS-variabler + @theme
  src/app/admin/layout.tsx          – Injisjerer chain på <html>, sender chainColor til Sidebar
  src/components/admin/sidebar.tsx  – Lys/merkevare tema, rolle-filtrert navigasjon
  src/components/admin/topbar.tsx   – Brand-farget aksentlinje øverst
  src/app/admin/page.tsx            – Ekte data fra Supabase
  src/app/admin/screens/page.tsx    – Ekte data + Realtime status
  src/app/admin/stores/page.tsx     – Ekte data fra Supabase
  src/app/admin/tags/page.tsx       – Ekte data fra Supabase
  src/app/admin/users/page.tsx      – Ekte data fra Supabase
  src/app/admin/content/news/page.tsx        – Ekte data
  src/app/admin/content/competitions/page.tsx – Ekte data
  src/app/admin/content/stats/page.tsx       – Ekte data
  src/app/admin/content/weather/page.tsx     – Ekte data
  src/app/admin/content/slides/page.tsx      – Ekte data
  src/app/admin/playlists/page.tsx           – Ekte data
  src/app/admin/publish/page.tsx             – Ekte data
  package.json                      – Legg til vitest, @vitejs/plugin-react, jsdom, @testing-library/*
  vite.config.ts (ny)               – Vitest-konfig
```

---

## Task 1: Test-infrastruktur (Vitest + React Testing Library)

**Filer:**
- Opprett: `vitest.config.ts`
- Opprett: `src/lib/admin/queries.test.ts` (tom, fylles i Task 2)
- Modifiser: `package.json`

- [ ] **Steg 1: Installer test-avhengigheter**

```bash
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Steg 2: Opprett `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Steg 3: Opprett `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Steg 4: Legg til test-script i `package.json`**

Finn `"scripts"` i package.json og legg til:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Steg 5: Verifiser at oppsett fungerer**

```bash
npm run test:run
```

Forventet output: `No test files found` (ingen feil, ingen krasj).

- [ ] **Steg 6: Commit**

```bash
git add vitest.config.ts src/test-setup.ts package.json package-lock.json
git commit -m "chore: legg til Vitest + React Testing Library"
```

---

## Task 2: Query-lag — testbare Supabase-funksjoner

Alle admin-sider bruker inline Supabase-kall. Vi trekker dem ut til en fil slik at de er testbare og ikke dupliseres.

**Filer:**
- Opprett: `src/lib/admin/queries.ts`
- Opprett: `src/lib/admin/queries.test.ts`

- [ ] **Steg 1: Skriv failing test for `getAdminStats`**

Opprett `src/lib/admin/queries.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest'
import { getAdminStats, getChainOverview, formatLastSeen } from './queries'

describe('formatLastSeen', () => {
  it('returnerer "Akkurat nå" for timestamps under 1 minutt siden', () => {
    const now = new Date()
    const result = formatLastSeen(now.toISOString())
    expect(result).toBe('Akkurat nå')
  })

  it('returnerer minutter for timestamps 1-59 min siden', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const result = formatLastSeen(fiveMinutesAgo.toISOString())
    expect(result).toBe('5 min siden')
  })

  it('returnerer timer for timestamps over 60 min siden', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const result = formatLastSeen(twoHoursAgo.toISOString())
    expect(result).toBe('2 timer siden')
  })

  it('returnerer "Aldri" for null', () => {
    const result = formatLastSeen(null)
    expect(result).toBe('Aldri')
  })
})

describe('getAdminStats', () => {
  it('returnerer null-verdier ved Supabase-feil', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: null, error: new Error('DB error') }),
        }),
      }),
    }
    const result = await getAdminStats(mockSupabase as any)
    expect(result.onlineScreens).toBe(0)
    expect(result.totalScreens).toBe(0)
  })
})
```

- [ ] **Steg 2: Kjør test — verifiser at den feiler**

```bash
npm run test:run
```

Forventet: `FAIL` — `formatLastSeen` ikke definert.

- [ ] **Steg 3: Opprett `src/lib/admin/queries.ts`**

```ts
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type AdminSupabase = SupabaseClient<Database>

// ─── Hjelpefunksjoner ────────────────────────────────────────────────────────

export function formatLastSeen(timestamp: string | null): string {
  if (!timestamp) return 'Aldri'
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Akkurat nå'
  if (minutes < 60) return `${minutes} min siden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} time${hours === 1 ? '' : 'r'} siden`
  const days = Math.floor(hours / 24)
  return `${days} dag${days === 1 ? '' : 'er'} siden`
}

export function getScreenStatusColor(status: string, lastHeartbeat: string | null): 'green' | 'yellow' | 'red' {
  if (status === 'inactive') return 'red'
  if (!lastHeartbeat) return 'red'
  const minutesSince = (Date.now() - new Date(lastHeartbeat).getTime()) / 60_000
  if (minutesSince < 3) return 'green'
  if (minutesSince < 15) return 'yellow'
  return 'red'
}

// ─── Dashboard-spørringer ────────────────────────────────────────────────────

export interface AdminStats {
  onlineScreens: number
  totalScreens: number
  pendingApproval: number
  totalStores: number
  liveContent: number
}

export async function getAdminStats(supabase: AdminSupabase): Promise<AdminStats> {
  const [screensResult, pendingResult, storesResult, liveResult] = await Promise.all([
    supabase.from('screens').select('id, last_heartbeat, status'),
    supabase.from('content_items').select('id', { count: 'exact' }).eq('status', 'pending_approval'),
    supabase.from('stores').select('id', { count: 'exact' }),
    supabase.from('content_items').select('id', { count: 'exact' }).eq('status', 'approved'),
  ])

  const screens = screensResult.data ?? []
  const onlineScreens = screens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) !== 'red'
  ).length

  return {
    onlineScreens,
    totalScreens: screens.length,
    pendingApproval: pendingResult.count ?? 0,
    totalStores: storesResult.count ?? 0,
    liveContent: liveResult.count ?? 0,
  }
}

// ─── Kjede-oversikt ─────────────────────────────────────────────────────────

export interface ChainOverviewItem {
  name: string
  color: string
  storeCount: number
  totalScreens: number
  onlineScreens: number
}

export async function getChainOverview(supabase: AdminSupabase): Promise<ChainOverviewItem[]> {
  const { data: chains } = await supabase
    .from('chains')
    .select('id, name, color, stores(id, screens(id, status, last_heartbeat))')

  if (!chains) return []

  return chains.map((chain) => {
    const stores = (chain.stores as any[]) ?? []
    const screens = stores.flatMap((s) => (s.screens as any[]) ?? [])
    const onlineScreens = screens.filter(
      (s) => getScreenStatusColor(s.status, s.last_heartbeat) !== 'red'
    ).length

    return {
      name: chain.name,
      color: chain.color,
      storeCount: stores.length,
      totalScreens: screens.length,
      onlineScreens,
    }
  })
}

// ─── Skjerm-spørringer ───────────────────────────────────────────────────────

export async function getScreensWithStore(supabase: AdminSupabase) {
  const { data, error } = await supabase
    .from('screens')
    .select(`
      id, name, token, status, last_heartbeat, last_seen_at, app_info,
      store:stores(
        id, name,
        chain:chains(id, name, color)
      )
    `)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

// ─── Butikk-spørringer ───────────────────────────────────────────────────────

export async function getStoresGroupedByChain(supabase: AdminSupabase) {
  const { data: chains } = await supabase
    .from('chains')
    .select('id, name, color, stores(id, name, company_name, city, email, org_number, gln, screens(id))')
    .order('name')

  return chains ?? []
}

// ─── Tag-spørringer ──────────────────────────────────────────────────────────

export async function getTagsWithStores(supabase: AdminSupabase) {
  const { data } = await supabase
    .from('tags')
    .select('id, name, color, store_tags(store:stores(id, name))')
    .order('name')

  return data ?? []
}

// ─── Bruker-spørringer ───────────────────────────────────────────────────────

export async function getUsersWithDetails(supabase: AdminSupabase) {
  const { data } = await supabase
    .from('users')
    .select(`
      id, email, full_name, role,
      chain:chains(id, name, color),
      user_stores(store:stores(id, name))
    `)
    .order('full_name')

  return data ?? []
}

// ─── Innhold-spørringer ──────────────────────────────────────────────────────

export async function getContentItems(
  supabase: AdminSupabase,
  type: Database['public']['Enums']['content_type']
) {
  const { data } = await supabase
    .from('content_items')
    .select(`
      id, title, status, created_at, valid_from, valid_to, body,
      creator:users!created_by(full_name)
    `)
    .eq('type', type)
    .order('created_at', { ascending: false })

  return data ?? []
}

// ─── Playliste-spørringer ────────────────────────────────────────────────────

export async function getPlaylistsWithItems(supabase: AdminSupabase) {
  const { data } = await supabase
    .from('playlists')
    .select(`
      id, name,
      playlist_items(
        id, position, duration_seconds,
        content_item:content_items(id, title, type)
      )
    `)
    .order('name')

  return data ?? []
}

// ─── Publish-spørringer ──────────────────────────────────────────────────────

export async function getPendingContent(supabase: AdminSupabase) {
  const { data } = await supabase
    .from('content_items')
    .select(`
      id, title, type, status, created_at,
      creator:users!created_by(full_name)
    `)
    .in('status', ['draft', 'pending_approval', 'approved'])
    .order('created_at', { ascending: false })

  return data ?? []
}
```

- [ ] **Steg 4: Kjør test — verifiser at de passerer**

```bash
npm run test:run
```

Forventet: `PASS` — alle 4 tester grønne.

- [ ] **Steg 5: Commit**

```bash
git add src/lib/admin/queries.ts src/lib/admin/queries.test.ts
git commit -m "feat: legg til testbare admin query-funksjoner med formatLastSeen"
```

---

## Task 3: Brand-fargesystem (CSS-variabler + Tailwind CSS 4)

Kjedefargen settes på `<html>` ved innlogging og brukes som `--color-brand` overalt i admin.

**Filer:**
- Modifiser: `src/app/globals.css`
- Modifiser: `src/app/admin/layout.tsx`

- [ ] **Steg 1: Oppdater `src/app/globals.css`**

Erstatt hele filen med:

```css
@import "tailwindcss";

@theme {
  --color-brand: var(--brand-primary);
  --color-brand-light: var(--brand-light);
  --color-brand-fg: var(--brand-fg);
}

:root {
  /* Standard (SPAR grønn som default) */
  --brand-primary: #007B40;
  --brand-light: #f0faf4;
  --brand-fg: #ffffff;

  --background: #f8f8f6;
  --foreground: #0a0a0a;
  --card: #ffffff;
  --card-foreground: #0a0a0a;
  --primary: #18181b;
  --primary-foreground: #fafafa;
  --secondary: #f4f4f5;
  --secondary-foreground: #18181b;
  --muted: #f4f4f5;
  --muted-foreground: #71717a;
  --accent: #f4f4f5;
  --accent-foreground: #18181b;
  --destructive: #ef4444;
  --border: #e4e4e7;
  --input: #e4e4e7;
  --ring: #18181b;
  --radius: 0.5rem;
}

/* Kjedefarger — settes på <html data-chain="..."> */
[data-chain="SPAR"] {
  --brand-primary: #007B40;
  --brand-light: #f0faf4;
  --brand-fg: #ffffff;
}

[data-chain="EUROSPAR"] {
  --brand-primary: #E30613;
  --brand-light: #fff1f2;
  --brand-fg: #ffffff;
}

[data-chain="JOKER"] {
  --brand-primary: #F7A600;
  --brand-light: #fffbeb;
  --brand-fg: #1a1a1a;
}

[data-chain="super_admin"] {
  --brand-primary: #6366f1;
  --brand-light: #eef2ff;
  --brand-fg: #ffffff;
}

* {
  border-color: var(--border);
  box-sizing: border-box;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #d4d4d8; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #a1a1aa; }
```

- [ ] **Steg 2: Oppdater `src/app/admin/layout.tsx`** for å injisere kjedefarge

```tsx
import { Sidebar } from "@/components/admin/sidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, chain:chains(name, color)")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  const chain = (profile?.chain as { name: string; color: string } | null)
  // super_admin har ingen chain — bruker "super_admin" som data-chain
  const chainKey = role === "super_admin" ? "super_admin" : (chain?.name ?? "SPAR")

  return (
    <html data-chain={chainKey}>
      <body>
        <div className="min-h-screen bg-[--background]">
          <Sidebar
            user={{
              email: user.email ?? "",
              fullName: profile?.full_name ?? "Admin",
              role,
              chainName: chain?.name ?? null,
              chainColor: chain?.color ?? null,
            }}
          />
          <main className="ml-64 min-h-screen flex flex-col">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
```

> **Merk:** Next.js 16 tillater ikke å wrappe `<html>` i layout.tsx når root layout allerede gjør det. Bruk `script` + `useEffect` i stedet for å sette `data-chain` på `document.documentElement`. Se steg 3.

- [ ] **Steg 3: Bruk ChainThemeProvider i stedet**

Siden Next.js App Router har én root `<html>`, sett `data-chain` via en Client Component. Opprett `src/components/admin/chain-theme-provider.tsx`:

```tsx
"use client"

import { useEffect } from "react"

interface ChainThemeProviderProps {
  chainKey: string
  children: React.ReactNode
}

export function ChainThemeProvider({ chainKey, children }: ChainThemeProviderProps) {
  useEffect(() => {
    document.documentElement.setAttribute("data-chain", chainKey)
    return () => {
      document.documentElement.removeAttribute("data-chain")
    }
  }, [chainKey])

  return <>{children}</>
}
```

Oppdater `src/app/admin/layout.tsx` til å bruke denne:

```tsx
import { Sidebar } from "@/components/admin/sidebar"
import { ChainThemeProvider } from "@/components/admin/chain-theme-provider"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role, chain:chains(name, color)")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  const chain = profile?.chain as { name: string; color: string } | null
  const chainKey = role === "super_admin" ? "super_admin" : (chain?.name ?? "SPAR")

  return (
    <ChainThemeProvider chainKey={chainKey}>
      <div className="min-h-screen bg-[--background]">
        <Sidebar
          user={{
            email: user.email ?? "",
            fullName: profile?.full_name ?? "Admin",
            role,
            chainName: chain?.name ?? null,
            chainColor: chain?.color ?? null,
          }}
        />
        <main className="ml-64 min-h-screen flex flex-col">
          {children}
        </main>
      </div>
    </ChainThemeProvider>
  )
}
```

- [ ] **Steg 4: Verifiser at siden bygger**

```bash
npm run build 2>&1 | tail -20
```

Forventet: Ingen TypeScript-feil. Sidebar vil ha TypeScript-feil på de nye props — dette fikses i Task 4.

- [ ] **Steg 5: Commit**

```bash
git add src/app/globals.css src/app/admin/layout.tsx src/components/admin/chain-theme-provider.tsx
git commit -m "feat: brand-fargesystem med CSS-variabler per kjede"
```

---

## Task 4: Sidebar — lys/merkevare-tema + rolle-basert navigasjon

**Filer:**
- Modifiser: `src/components/admin/sidebar.tsx`

- [ ] **Steg 1: Erstatt `src/components/admin/sidebar.tsx` fullstendig**

```tsx
"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, Store, Monitor, Newspaper, Trophy,
  BarChart3, CloudSun, Images, ListVideo, Send, Users,
  Settings, Tag, ChevronRight, LogOut, Layers,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type UserRole = "super_admin" | "chain_manager" | "store_manager" | "store_employee"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: "Oversikt",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "chain_manager", "store_manager", "store_employee"] },
    ],
  },
  {
    label: "Organisasjon",
    items: [
      { href: "/admin/stores", label: "Butikker", icon: Store, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/screens", label: "Skjermer", icon: Monitor, roles: ["super_admin", "chain_manager", "store_manager"] },
      { href: "/admin/tags", label: "Tags", icon: Tag, roles: ["super_admin", "chain_manager"] },
    ],
  },
  {
    label: "Innhold",
    items: [
      { href: "/admin/content/news", label: "Nyheter", icon: Newspaper, roles: ["super_admin", "chain_manager", "store_manager", "store_employee"] },
      { href: "/admin/content/competitions", label: "Konkurranser", icon: Trophy, roles: ["super_admin", "chain_manager", "store_manager"] },
      { href: "/admin/content/stats", label: "Salgstall", icon: BarChart3, roles: ["super_admin", "chain_manager", "store_manager"] },
      { href: "/admin/content/weather", label: "Vær", icon: CloudSun, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/content/slides", label: "Slides", icon: Images, roles: ["super_admin", "chain_manager", "store_manager"] },
    ],
  },
  {
    label: "Distribusjon",
    items: [
      { href: "/admin/playlists", label: "Spillelister", icon: ListVideo, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/publish", label: "Publiser", icon: Send, roles: ["super_admin", "chain_manager", "store_manager"] },
    ],
  },
  {
    label: "Administrasjon",
    items: [
      { href: "/admin/users", label: "Brukere", icon: Users, roles: ["super_admin", "chain_manager"] },
      { href: "/admin/settings", label: "Innstillinger", icon: Settings, roles: ["super_admin", "chain_manager", "store_manager"] },
    ],
  },
]

interface SidebarProps {
  user: {
    email: string
    fullName: string
    role: string
    chainName: string | null
    chainColor: string | null
  }
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  chain_manager: "Kjedeleder",
  store_manager: "Butikksjef",
  store_employee: "Ansatt",
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const role = user.role as UserRole

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-zinc-200 flex flex-col z-40 shadow-sm">
      {/* Logo / Kjedenavn */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          <Layers className="w-4 h-4" style={{ color: "var(--brand-fg)" }} />
        </div>
        <div>
          <p className="text-zinc-900 font-bold text-sm leading-tight">
            {user.chainName ?? "Infoskjerm"}
          </p>
          <p className="text-zinc-400 text-xs">Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label} className="mb-5">
              <p className="text-zinc-400 text-[10px] font-semibold uppercase tracking-widest px-2 mb-1.5">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group",
                          active
                            ? "font-medium text-white"
                            : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                        )}
                        style={active ? { backgroundColor: "var(--brand-primary)" } : undefined}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                        {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-100">
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-zinc-900 text-xs font-medium truncate">{user.fullName}</p>
            <p className="text-zinc-400 text-xs truncate">{roleLabels[user.role] ?? user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0"
            title="Logg ut"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Steg 2: Kjør TypeScript-sjekk**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Forventet: Ingen feil. Hvis feil, se etter type-mismatch i `SidebarProps`.

- [ ] **Steg 3: Commit**

```bash
git add src/components/admin/sidebar.tsx
git commit -m "feat: lys/merkevare sidebar med rolle-basert navigasjon"
```

---

## Task 5: Topbar — brand-aksentlinje

**Filer:**
- Modifiser: `src/components/admin/topbar.tsx`

- [ ] **Steg 1: Erstatt `src/components/admin/topbar.tsx`**

```tsx
"use client"

import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-zinc-100 shadow-sm">
      {/* Brand-aksentlinje øverst */}
      <div className="h-0.5 w-full" style={{ backgroundColor: "var(--brand-primary)" }} />

      <div className="h-15 flex items-center px-6 gap-4 py-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold text-zinc-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <Button variant="ghost" size="icon" className="relative text-zinc-500 hover:text-zinc-900">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--brand-primary)" }} />
          </Button>
        </div>
      </div>
    </header>
  )
}
```

- [ ] **Steg 2: Commit**

```bash
git add src/components/admin/topbar.tsx
git commit -m "feat: topbar med brand-aksentlinje"
```

---

## Task 6: ScreenStatusDot + Realtime-hook

**Filer:**
- Opprett: `src/lib/realtime/screens.ts`
- Opprett: `src/components/admin/screen-status-dot.tsx`

- [ ] **Steg 1: Opprett `src/lib/realtime/screens.ts`**

```ts
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export interface ScreenStatus {
  id: string
  status: string
  last_heartbeat: string | null
}

export function useScreenStatuses(initialStatuses: ScreenStatus[]) {
  const [statuses, setStatuses] = useState<Map<string, ScreenStatus>>(
    new Map(initialStatuses.map((s) => [s.id, s]))
  )

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel("screen-statuses")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "screens",
          filter: undefined,
        },
        (payload) => {
          const updated = payload.new as ScreenStatus
          setStatuses((prev) => {
            const next = new Map(prev)
            next.set(updated.id, updated)
            return next
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return statuses
}
```

- [ ] **Steg 2: Opprett `src/components/admin/screen-status-dot.tsx`**

```tsx
import { cn } from "@/lib/utils"
import { getScreenStatusColor } from "@/lib/admin/queries"

interface ScreenStatusDotProps {
  status: string
  lastHeartbeat: string | null
  showLabel?: boolean
  size?: "sm" | "md"
}

const colorMap = {
  green: { dot: "bg-emerald-500", ring: "ring-emerald-200", label: "Online", text: "text-emerald-700", bg: "bg-emerald-50" },
  yellow: { dot: "bg-amber-400", ring: "ring-amber-200", label: "Treg", text: "text-amber-700", bg: "bg-amber-50" },
  red: { dot: "bg-red-500", ring: "ring-red-200", label: "Offline", text: "text-red-700", bg: "bg-red-50" },
}

export function ScreenStatusDot({ status, lastHeartbeat, showLabel = false, size = "sm" }: ScreenStatusDotProps) {
  const color = getScreenStatusColor(status, lastHeartbeat)
  const { dot, ring, label, text, bg } = colorMap[color]
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5"

  if (!showLabel) {
    return (
      <span className={cn("inline-block rounded-full ring-2", dotSize, dot, ring)} />
    )
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", bg, text)}>
      <span className={cn("rounded-full", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2", dot)} />
      {label}
    </span>
  )
}
```

- [ ] **Steg 3: Commit**

```bash
git add src/lib/realtime/screens.ts src/components/admin/screen-status-dot.tsx
git commit -m "feat: Supabase Realtime screen-status hook og ScreenStatusDot komponent"
```

---

## Task 7: Dashboard — ekte data

**Filer:**
- Modifiser: `src/app/admin/page.tsx`

- [ ] **Steg 1: Erstatt `src/app/admin/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScreenStatusDot } from "@/components/admin/screen-status-dot"
import { Monitor, Store, AlertCircle, CheckCircle2, ArrowRight, Eye, Clock } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getAdminStats, getChainOverview, formatLastSeen, getScreenStatusColor } from "@/lib/admin/queries"

export default async function AdminDashboard() {
  const supabase = await createClient()
  const [stats, chains, recentScreens] = await Promise.all([
    getAdminStats(supabase),
    getChainOverview(supabase),
    supabase
      .from("screens")
      .select("id, name, status, last_heartbeat, store:stores(name)")
      .order("last_heartbeat", { ascending: false, nullsFirst: false })
      .limit(16)
      .then((r) => r.data ?? []),
  ])

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Dashboard"
        subtitle="Gange-Rolv Infoskjerm — oversikt"
        actions={
          <Button asChild size="sm" style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }}>
            <Link href="/admin/publish">
              <Eye className="w-4 h-4" />
              Publiser innhold
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Skjermer online</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.onlineScreens}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">av {stats.totalScreens} totalt</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Butikker</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.totalStores}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{chains.length} kjeder</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Store className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Til godkjenning</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.pendingApproval}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">venter på deg</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-zinc-500 font-medium">Innhold live</p>
                  <p className="text-3xl font-bold text-zinc-900 mt-1">{stats.liveContent}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">aktive elementer</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Kjede-oversikt */}
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Kjeder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chains.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">Ingen kjeder funnet</p>
              )}
              {chains.map((chain) => (
                <div key={chain.name} className="flex items-center gap-3">
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: chain.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-900">{chain.name}</p>
                      <span className="text-xs text-zinc-400">{chain.storeCount} butikker</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: chain.totalScreens > 0 ? `${(chain.onlineScreens / chain.totalScreens) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{chain.onlineScreens}/{chain.totalScreens} online</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-2 text-zinc-500" asChild>
                <Link href="/admin/stores">
                  Se alle butikker <ArrowRight className="w-3 h-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Skjermstatus */}
          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Skjermstatus</CardTitle>
                <Button variant="ghost" size="sm" className="text-zinc-400" asChild>
                  <Link href="/admin/screens">Se alle <ArrowRight className="w-3 h-3" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentScreens.length === 0 && (
                <div className="text-center py-8">
                  <Monitor className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Ingen skjermer registrert ennå</p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link href="/admin/settings">Registrer første skjerm</Link>
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {recentScreens.map((screen) => {
                  const color = getScreenStatusColor(screen.status, screen.last_heartbeat)
                  const bgMap = { green: "bg-emerald-50 border-emerald-100", yellow: "bg-amber-50 border-amber-100", red: "bg-red-50 border-red-100" }
                  const storeName = (screen.store as { name: string } | null)?.name ?? "Ukjent butikk"
                  return (
                    <div key={screen.id} className={`rounded-lg p-2.5 border text-center ${bgMap[color]}`}>
                      <ScreenStatusDot status={screen.status} lastHeartbeat={screen.last_heartbeat} size="sm" />
                      <p className="text-[10px] font-medium text-zinc-700 leading-tight mt-1.5">{storeName}</p>
                      <p className="text-[9px] text-zinc-400 mt-0.5">{formatLastSeen(screen.last_heartbeat)}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Steg 2: Sjekk at siden bygger uten feil**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Steg 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: dashboard med ekte Supabase-data og live skjermstatus"
```

---

## Task 8: Screens-side — ekte data

**Filer:**
- Modifiser: `src/app/admin/screens/page.tsx`

- [ ] **Steg 1: Erstatt `src/app/admin/screens/page.tsx`**

```tsx
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScreenStatusDot } from "@/components/admin/screen-status-dot"
import { Monitor, Copy, RefreshCw, Plus, CheckCircle2, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getScreensWithStore, formatLastSeen, getScreenStatusColor } from "@/lib/admin/queries"
import { CopyTokenButton } from "./_components/copy-token-button"
import { ScreenActionButton } from "./_components/screen-action-button"

export default async function ScreensPage() {
  const supabase = await createClient()
  const screens = await getScreensWithStore(supabase)

  const online = screens.filter((s) => getScreenStatusColor(s.status, s.last_heartbeat) !== "red").length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Skjermer"
        subtitle={`${online} av ${screens.length} online`}
        actions={
          <Button size="sm" style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }}>
            <Plus className="w-4 h-4" />
            Ny skjerm
          </Button>
        }
      />

      <div className="flex-1 p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{online}</p>
                <p className="text-xs text-zinc-500">Online</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{screens.length - online}</p>
                <p className="text-xs text-zinc-500">Offline</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Monitor className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900">{screens.length}</p>
                <p className="text-xs text-zinc-500">Totalt</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Butikk</th>
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Navn</th>
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Sist sett</th>
                  <th className="text-left p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Token</th>
                  <th className="text-right p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {screens.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-zinc-400">
                      <Monitor className="w-8 h-8 mx-auto mb-2 text-zinc-200" />
                      Ingen skjermer registrert ennå
                    </td>
                  </tr>
                )}
                {screens.map((screen) => {
                  const store = screen.store as { name: string; chain: { name: string; color: string } | null } | null
                  return (
                    <tr key={screen.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4">
                        <ScreenStatusDot status={screen.status} lastHeartbeat={screen.last_heartbeat} showLabel size="md" />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {store?.chain && (
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: store.chain.color }} />
                          )}
                          <span className="font-medium text-zinc-900">{store?.name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="p-4 text-zinc-600">{screen.name}</td>
                      <td className="p-4 text-zinc-500 hidden lg:table-cell">{formatLastSeen(screen.last_heartbeat)}</td>
                      <td className="p-4 hidden xl:table-cell">
                        <CopyTokenButton token={screen.token} screenId={screen.id} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ScreenActionButton screenId={screen.id} action="reload" />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Steg 2: Opprett `src/app/admin/screens/_components/copy-token-button.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"

interface CopyTokenButtonProps {
  token: string
  screenId: string
}

export function CopyTokenButton({ token, screenId }: CopyTokenButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs text-zinc-400 font-mono truncate max-w-[140px]">{token.slice(0, 20)}…</code>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      </Button>
    </div>
  )
}
```

- [ ] **Steg 3: Opprett `src/app/admin/screens/_components/screen-action-button.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ScreenActionButtonProps {
  screenId: string
  action: "reload" | "reboot" | "power_off" | "power_on"
}

const actionLabels = {
  reload: "Last inn på nytt",
  reboot: "Restart Pi",
  power_off: "Skjerm av",
  power_on: "Skjerm på",
}

export function ScreenActionButton({ screenId, action }: ScreenActionButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleAction = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from("screens")
      .update({ pending_command: action })
      .eq("id", screenId)
    setLoading(false)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
      onClick={handleAction}
      disabled={loading}
      title={actionLabels[action]}
    >
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
    </Button>
  )
}
```

- [ ] **Steg 4: Commit**

```bash
git add src/app/admin/screens/
git commit -m "feat: skjermer-side med ekte data og fjernstyring"
```

---

## Task 9: Stores, Tags, Users — ekte data

**Filer:**
- Modifiser: `src/app/admin/stores/page.tsx`
- Modifiser: `src/app/admin/tags/page.tsx`
- Modifiser: `src/app/admin/users/page.tsx`

- [ ] **Steg 1: Oppdater `src/app/admin/stores/page.tsx`**

Erstatt den eksisterende mock-data-konstanten med en server-side query. Finn og erstatt seksjonen der `mockStores`/`stores` er hardkodet:

```tsx
// Øverst i filen — erstatt import-blokk og mock-data med:
import { createClient } from "@/lib/supabase/server"
import { getStoresGroupedByChain } from "@/lib/admin/queries"

export default async function StoresPage() {
  const supabase = await createClient()
  const chains = await getStoresGroupedByChain(supabase)
  // Resten av JSX bruker `chains` i stedet for hardkodet data
  // ...
}
```

Behold eksisterende JSX-struktur — bytt kun datakilden. Erstatt `chainOverview.map(...)` med `chains.map(chain => ...)` og tilpass felt-navn til databaseskjemaet:
- `chain.name` → `chain.name`
- `chain.color` → `chain.color`
- `chain.stores` → `(chain.stores as any[]) ?? []`
- Butikk-felt: `store.name`, `store.company_name`, `store.city`, `store.email`, `store.org_number`, `store.gln`, `(store.screens as any[])?.length ?? 0`

- [ ] **Steg 2: Oppdater `src/app/admin/tags/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server"
import { getTagsWithStores } from "@/lib/admin/queries"

export default async function TagsPage() {
  const supabase = await createClient()
  const tags = await getTagsWithStores(supabase)
  // Behold JSX-struktur, bytt data
}
```

- [ ] **Steg 3: Oppdater `src/app/admin/users/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server"
import { getUsersWithDetails } from "@/lib/admin/queries"

export default async function UsersPage() {
  const supabase = await createClient()
  const users = await getUsersWithDetails(supabase)
  // Behold JSX-struktur, bytt data
}
```

- [ ] **Steg 4: Kjør TypeScript-sjekk**

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -20
```

Fix eventuelle type-feil ved å caste `chain.stores as any[]` der TypeScript klager på nested relations fra Supabase.

- [ ] **Steg 5: Commit**

```bash
git add src/app/admin/stores/page.tsx src/app/admin/tags/page.tsx src/app/admin/users/page.tsx
git commit -m "feat: butikker, tags og brukere med ekte Supabase-data"
```

---

## Task 10: Innholdssider — ekte data

Alle 5 innholdssider bruker samme mønster. Typen er det eneste som varierer.

**Filer:**
- Modifiser: `src/app/admin/content/news/page.tsx`
- Modifiser: `src/app/admin/content/competitions/page.tsx`
- Modifiser: `src/app/admin/content/stats/page.tsx`
- Modifiser: `src/app/admin/content/weather/page.tsx`
- Modifiser: `src/app/admin/content/slides/page.tsx`

- [ ] **Steg 1: Opprett felles data-henting for alle innholdssider**

Legg til i `src/lib/admin/queries.ts` (allerede der fra Task 2 — `getContentItems`-funksjonen dekker dette).

- [ ] **Steg 2: Oppdater `src/app/admin/content/news/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server"
import { getContentItems, formatLastSeen } from "@/lib/admin/queries"
// Behold eksisterende import av Topbar, Card, Badge, Button, Lucide-ikoner

export default async function NewsPage() {
  const supabase = await createClient()
  const items = await getContentItems(supabase, "news")
  // Behold JSX-struktur, bytt `mockNews`-konstanten med `items`
  // Felt-mapping:
  // item.title → item.title
  // item.status → item.status
  // item.creator?.full_name → forfatternavn
  // formatLastSeen(item.created_at) → "Opprettet for X siden"
}
```

- [ ] **Steg 3: Oppdater de 4 øvrige innholdssidene med samme mønster**

Gjenta steg 2 for:
- `competitions/page.tsx` → `getContentItems(supabase, "competition")`
- `stats/page.tsx` → `getContentItems(supabase, "stats")`
- `weather/page.tsx` → `getContentItems(supabase, "weather")`
- `slides/page.tsx` → `getContentItems(supabase, "slide")`

- [ ] **Steg 4: Tom-tilstand — legg til "Ingen innhold ennå"-melding**

Alle innholdssider skal vise en meningsfull tom-tilstand. Legg til i hver side:

```tsx
{items.length === 0 && (
  <div className="text-center py-16">
    <Newspaper className="w-10 h-10 text-zinc-200 mx-auto mb-3" />
    <p className="text-zinc-500 font-medium">Ingen nyheter ennå</p>
    <p className="text-sm text-zinc-400 mt-1">Klikk "Ny nyhet" for å komme i gang</p>
  </div>
)}
```

(Bytt ikon og tekst per innholdstype.)

- [ ] **Steg 5: Commit**

```bash
git add src/app/admin/content/
git commit -m "feat: alle innholdssider med ekte Supabase-data og tom-tilstand"
```

---

## Task 11: Playlister og Publiser — ekte data

**Filer:**
- Modifiser: `src/app/admin/playlists/page.tsx`
- Modifiser: `src/app/admin/publish/page.tsx`

- [ ] **Steg 1: Oppdater `src/app/admin/playlists/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server"
import { getPlaylistsWithItems } from "@/lib/admin/queries"

export default async function PlaylistsPage() {
  const supabase = await createClient()
  const playlists = await getPlaylistsWithItems(supabase)
  // Behold eksisterende JSX, bytt data
  // Felt: playlist.name, (playlist.playlist_items as any[])?.length ?? 0
}
```

- [ ] **Steg 2: Oppdater `src/app/admin/publish/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server"
import { getPendingContent } from "@/lib/admin/queries"

export default async function PublishPage() {
  const supabase = await createClient()
  const items = await getPendingContent(supabase)
  // Behold eksisterende multi-steg wizard JSX, bytt data
}
```

- [ ] **Steg 3: Commit**

```bash
git add src/app/admin/playlists/page.tsx src/app/admin/publish/page.tsx
git commit -m "feat: playlister og publiseringsside med ekte Supabase-data"
```

---

## Task 12: Kjøre alle tester + bygge produksjon

- [ ] **Steg 1: Kjør alle tester**

```bash
npm run test:run
```

Forventet: Alle tester PASS. Fiks eventuelle feil før du går videre.

- [ ] **Steg 2: Kjør TypeScript-sjekk**

```bash
npx tsc --noEmit
```

Forventet: Ingen feil.

- [ ] **Steg 3: Kjør produksjonsbygg**

```bash
npm run build 2>&1 | tail -30
```

Forventet: `✓ Compiled successfully`. Fiks eventuelle build-feil.

- [ ] **Steg 4: Start dev-server og verifiser manuelt**

```bash
npm run dev
```

Åpne http://localhost:3000 og verifiser:
- [ ] Sidebar er lys med kjedefarge som aksentfarge for aktiv side
- [ ] Topbar har brand-aksentlinje øverst
- [ ] Dashboard viser ekte tall (ikke hardkodet mock-data)
- [ ] Skjermstatus-grid viser ekte skjermer
- [ ] Innholdssider viser ekte innhold (eller tom-tilstand)
- [ ] Rolle-basert navigasjon fungerer (test med ulike roller i databasen)

- [ ] **Steg 5: Stopp visual companion server**

```bash
bash /Users/frlund3/.claude/plugins/cache/claude-plugins-official/superpowers/5.1.0/skills/brainstorming/scripts/stop-server.sh /Users/frlund3/Documents/GitHub/infoskjerm/.superpowers/brainstorm/49283-1782639180
```

- [ ] **Steg 6: Final commit**

```bash
git add -A
git commit -m "feat: Sprint 1 komplett — lys/merkevare admin, ekte Supabase-data, live skjermstatus"
```

---

## Sprint 2–7 — separate planfiler

Disse planfilene skrives og startes etter at Sprint 1 er godkjent:

| Sprint | Plan-fil (opprettes ved start) | Forutsetning |
|--------|-------------------------------|--------------|
| Sprint 2 | `2026-06-28-sprint-2-modul-register.md` | Sprint 1 ferdig |
| Sprint 3 | `2026-06-28-sprint-3-innholdsbygger.md` | Sprint 2 ferdig |
| Sprint 4 | `2026-06-28-sprint-4-publiseringsflyt.md` | Sprint 3 ferdig |
| Sprint 5 | `2026-06-28-sprint-5-skjermkart.md` | Sprint 1 ferdig (parallelt med Sprint 3) |
| Sprint 6 | `2026-06-28-sprint-6-sone-editor.md` | Sprint 2 ferdig |
| Sprint 7 | `2026-06-28-sprint-7-fase2-moduler.md` | Sprint 3 ferdig |
