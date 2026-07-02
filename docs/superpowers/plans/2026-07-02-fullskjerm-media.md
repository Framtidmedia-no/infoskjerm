# Fullskjerm-media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ny visningsmodus «Fullskjerm (kun media)» på slide-innhold — bilde/video/PDF/PPT kant til kant uten tittel/ramme, med valgfri variant per orientering (liggende 1920×1080 / stående 1080×1920), blur-fill-fallback, og audience «begge» så samme element kan vises på intern OG kundeskjerm.

**Architecture:** Utvider `slide` med `imageMode: "fullskjerm"` + `body.portraitUrl`/`portraitPages`/`portraitPagesFor` (JSONB, ingen migrasjon). Ny delt komponent `FullscreenMedia` plugges først inn i alle tre rotatorer. PDF/PPT prerendres av eksisterende `render-decks` GitHub Action (utvidet med portrait-variant + PDF i fullskjerm-modus). Spec: `docs/superpowers/specs/2026-07-02-fullskjerm-media-design.md`.

**Tech Stack:** Next.js App Router, Supabase (service-role i widgets), vitest (co-located `*.test.ts`), Playwright.

**Gren:** `feat/fullskjerm-media` fra `upstream/dev`, i egen worktree (annet arbeid pågår i hoved-workingtree). PR → `upstream/dev`.

---

### Task 1: Delte audience-helpers (lib) + «begge»

**Files:**
- Create: `src/lib/content/audience.ts`
- Test: `src/lib/content/audience.test.ts`
- Modify: `src/app/admin/innhold/audience.ts` (re-eksport)
- Modify: `src/lib/content/live.ts:212-215, 277-283`
- Modify: `src/app/admin/innhold/content-data.ts:54-57, 78, 95, 101`

- [ ] **Step 1: Failing test**

```ts
// src/lib/content/audience.test.ts
import { describe, it, expect } from "vitest"
import { audienceForType, storedAudienceOf, audienceMatches } from "./audience"

describe("audienceForType", () => {
  it("defaults slide to kunde and everything else to intern", () => {
    expect(audienceForType("slide")).toBe("kunde")
    expect(audienceForType("news")).toBe("intern")
  })
})

describe("storedAudienceOf", () => {
  it("returns explicit audience values including begge", () => {
    expect(storedAudienceOf("news", "kunde")).toBe("kunde")
    expect(storedAudienceOf("slide", "intern")).toBe("intern")
    expect(storedAudienceOf("slide", "begge")).toBe("begge")
  })
  it("falls back to the type default for missing/garbage values", () => {
    expect(storedAudienceOf("slide", undefined)).toBe("kunde")
    expect(storedAudienceOf("news", "banan")).toBe("intern")
  })
})

describe("audienceMatches", () => {
  it("matches same surface and begge on both", () => {
    expect(audienceMatches("kunde", "kunde")).toBe(true)
    expect(audienceMatches("kunde", "intern")).toBe(false)
    expect(audienceMatches("begge", "kunde")).toBe(true)
    expect(audienceMatches("begge", "intern")).toBe(true)
  })
})
```

- [ ] **Step 2: Kjør** `pnpm vitest run src/lib/content/audience.test.ts` → FAIL (modul finnes ikke)

- [ ] **Step 3: Implementer** `src/lib/content/audience.ts`

```ts
/**
 * Flate-modell for innhold: kunde-skjermer vs interne skjermer. «begge» er en
 * lagret verdi (body.audience) som betyr at elementet vises på BEGGE flater —
 * brukes av fullskjerm-media. Ren modul (ingen server-avhengigheter) så både
 * widgets (service-role), admin-lister og klientkomponenter deler samme logikk.
 */

/** En skjermflate (overflaten innholdet vises på). */
export type Audience = "kunde" | "intern"

/** Lagret på body.audience — «begge» = vis på begge flater. */
export type StoredAudience = Audience | "begge"

/** Standard flate for en innholdstype når ikke eksplisitt satt (tilbud → kunde). */
export function audienceForType(type: string): Audience {
  return type === "slide" ? "kunde" : "intern"
}

/** Normaliserer body.audience → lagret flate (faller tilbake til type-standard). */
export function storedAudienceOf(type: string, bodyAudience: unknown): StoredAudience {
  return bodyAudience === "kunde" || bodyAudience === "intern" || bodyAudience === "begge"
    ? bodyAudience
    : audienceForType(type)
}

/** True når innhold med lagret flate hører hjemme på gitt skjermflate. */
export function audienceMatches(stored: StoredAudience, surface: Audience): boolean {
  return stored === "begge" || stored === surface
}
```

- [ ] **Step 4:** `src/app/admin/innhold/audience.ts` erstattes med re-eksport (bevarer alle eksisterende imports):

```ts
export {
  audienceForType,
  storedAudienceOf,
  audienceMatches,
  type Audience,
  type StoredAudience,
} from "@/lib/content/audience"
```

- [ ] **Step 5:** `live.ts` — slett den inline `audienceOf`-funksjonen (linje 212–215), importer `{ storedAudienceOf, audienceMatches }` fra `@/lib/content/audience`, og endre filteret (linje 281):

```ts
(!audience || audienceMatches(storedAudienceOf(it.type, (it.body as { audience?: unknown } | null)?.audience), audience)) &&
```

- [ ] **Step 6:** `content-data.ts` — erstatt lokal `audienceOf` (linje 54–57) med import av `storedAudienceOf`/`audienceMatches`, endre filter (linje 78) til `audienceMatches(storedAudienceOf(it.type, (it.body as { audience?: unknown } | null)?.audience), audience)`. Thumbnail-fallback (linje 95+101): legg `portraitUrl?: string | null` i body-cast og `imageUrl: body.imageUrl ?? body.portraitUrl ?? null`.

- [ ] **Step 7:** `pnpm vitest run src/lib/content/audience.test.ts` → PASS. `pnpm vitest run` → alle grønne.

- [ ] **Step 8: Commit** `feat(innhold): audience «begge» — delt flate-logikk i lib`

---

### Task 2: Datamodell — ImageMode «fullskjerm» + portraitUrl (actions.ts + live.ts)

**Files:**
- Modify: `src/app/admin/innhold/actions.ts:50, 53-92, 112-134, 136-160, 225`
- Modify: `src/lib/content/live.ts:11, 59-101, 129-148, 293-310`

- [ ] **Step 1:** `actions.ts:50`:

```ts
export type ImageMode = "plakat" | "bakgrunn" | "liten" | "fullskjerm"
```

`live.ts:11` tilsvarende. `ContentInput` (actions.ts): endre `audience?: Audience` → `audience?: StoredAudience` (importer typen fra `./audience`) og legg til:

```ts
  /** Fullskjerm-modus: valgfri stående variant (bilde/video/PDF/PPT). imageUrl = liggende. */
  portraitUrl?: string | null
```

- [ ] **Step 2:** `buildBody()` — etter `imageMode`-linjen:

```ts
    ...(input.type === "slide" && input.imageMode === "fullskjerm" && input.portraitUrl ? { portraitUrl: input.portraitUrl } : {}),
```

- [ ] **Step 3:** `saveContent()` — validering etter tittel-sjekken (linje 140):

```ts
  if (input.imageMode === "fullskjerm" && !input.imageUrl && !input.portraitUrl)
    return { ok: false, error: "Last opp minst én fil (liggende eller stående)" }
```

Deck-deteksjon (linje 144–145) →

```ts
  const deckUrl = (input.imageUrls?.filter(Boolean)[0]) ?? input.imageUrl ?? null
  const portraitDeckUrl = input.imageMode === "fullskjerm" ? (input.portraitUrl ?? null) : null
  const isDeck = isDeckUrl(deckUrl) || isDeckUrl(portraitDeckUrl)
```

Bevar rendrede sider for BEGGE varianter (erstatt blokken linje 152–160):

```ts
    let bodyToSave = body
    if (isDeck) {
      const { data: existing } = await supabase
        .from("content_items").select("body").eq("id", id).eq("tenant_id", tenantId).maybeSingle()
      const eb = (existing?.body ?? {}) as Record<string, unknown>
      const merged = { ...(body as Record<string, unknown>) }
      if (Array.isArray(eb.pages) && eb.pages.length > 0 && eb.pagesFor === deckUrl) {
        merged.pages = eb.pages
        merged.pagesFor = eb.pagesFor
      }
      if (portraitDeckUrl && Array.isArray(eb.portraitPages) && eb.portraitPages.length > 0 && eb.portraitPagesFor === portraitDeckUrl) {
        merged.portraitPages = eb.portraitPages
        merged.portraitPagesFor = eb.portraitPagesFor
      }
      bodyToSave = merged as Json
    }
```

(`triggerDeckRender()` på linje 225 trigges allerede av `isDeck` — nå dekker den også portrait-varianten.)

- [ ] **Step 4:** `live.ts` — `LiveItem` får:

```ts
  /** Fullskjerm: valgfri stående media-variant (imageUrl = liggende/primær). */
  portraitUrl: string | null
  /** Fullskjerm: forhåndsrendrede sider for stående dokument-variant. */
  portraitPages: string[]
```

`Body`-interface: `portraitUrl?: string | null` og `portraitPages?: string[]`. Mapping i `fetchLiveContent` (linje 304-ish):

```ts
      imageMode: body.imageMode === "plakat" ? "plakat" : body.imageMode === "liten" ? "liten" : body.imageMode === "fullskjerm" ? "fullskjerm" : "bakgrunn",
      portraitUrl: body.portraitUrl ?? null,
      portraitPages: Array.isArray(body.portraitPages) ? body.portraitPages.filter(Boolean) : [],
```

- [ ] **Step 5:** `pnpm vitest run` + `npx tsc --noEmit` → tsc feiler nå på `LiveItem`-konstruksjon i `widget/preview/page.tsx` og `widget/tilbud/page.tsx:43` (mangler nye felt). Legg til `portraitUrl: null, portraitPages: [],` i begge synthetic items (preview fikses helhetlig i Task 5 — her holder det å tilfredsstille typen).

- [ ] **Step 6: Commit** `feat(innhold): imageMode «fullskjerm» + portraitUrl i datamodellen`

---

### Task 3: Pure helpers — variantvalg + visningstid (TDD)

**Files:**
- Create: `src/lib/content/fullscreen.ts`
- Test: `src/lib/content/fullscreen.test.ts`

- [ ] **Step 1: Failing test**

```ts
// src/lib/content/fullscreen.test.ts
import { describe, it, expect } from "vitest"
import { pickFullscreenVariant, fullscreenItemSeconds, FULLSCREEN_PAGE_SECONDS } from "./fullscreen"

const base = { imageUrl: null as string | null, pages: [] as string[], portraitUrl: null as string | null, portraitPages: [] as string[] }

describe("pickFullscreenVariant", () => {
  it("picks matching orientation when both exist", () => {
    const item = { ...base, imageUrl: "l.jpg", portraitUrl: "p.jpg" }
    expect(pickFullscreenVariant(item, false).url).toBe("l.jpg")
    expect(pickFullscreenVariant(item, true).url).toBe("p.jpg")
  })
  it("falls back to the other variant when one is missing", () => {
    expect(pickFullscreenVariant({ ...base, imageUrl: "l.jpg" }, true).url).toBe("l.jpg")
    expect(pickFullscreenVariant({ ...base, portraitUrl: "p.jpg" }, false).url).toBe("p.jpg")
  })
  it("carries the variant's own pages", () => {
    const item = { ...base, imageUrl: "l.pdf", pages: ["l1.jpg"], portraitUrl: "p.pdf", portraitPages: ["p1.jpg", "p2.jpg"] }
    expect(pickFullscreenVariant(item, true).pages).toEqual(["p1.jpg", "p2.jpg"])
    expect(pickFullscreenVariant(item, false).pages).toEqual(["l1.jpg"])
  })
})

describe("fullscreenItemSeconds", () => {
  it("returns null for non-fullskjerm items", () => {
    expect(fullscreenItemSeconds({ ...base, imageUrl: "x.jpg", imageMode: "plakat", durationSeconds: null }, false, 16)).toBeNull()
  })
  it("multiplies per-page duration for rendered decks", () => {
    const item = { ...base, imageUrl: "x.pdf", pages: ["1", "2", "3"], imageMode: "fullskjerm", durationSeconds: null }
    expect(fullscreenItemSeconds(item, false, 16)).toBe(FULLSCREEN_PAGE_SECONDS * 3)
    expect(fullscreenItemSeconds({ ...item, durationSeconds: 5 }, false, 16)).toBe(15)
  })
  it("uses duration or fallback for images", () => {
    const item = { ...base, imageUrl: "x.jpg", imageMode: "fullskjerm", durationSeconds: null }
    expect(fullscreenItemSeconds(item, false, 16)).toBe(16)
    expect(fullscreenItemSeconds({ ...item, durationSeconds: 30 }, false, 16)).toBe(30)
  })
})
```

- [ ] **Step 2:** `pnpm vitest run src/lib/content/fullscreen.test.ts` → FAIL

- [ ] **Step 3: Implementer** `src/lib/content/fullscreen.ts`

```ts
import { isDeckUrl } from "./deck"

/**
 * Ren logikk for fullskjerm-media: velger orienterings-variant og beregner
 * total visningstid. Delt mellom rotatorene (nyheter/tilbud/kampanje) så
 * varigheten og variant-fallbacken er identisk overalt.
 */

/** Sekunder per dokumentside når ingen egen visningstid er satt. */
export const FULLSCREEN_PAGE_SECONDS = 8

export interface FullscreenSource {
  imageUrl: string | null
  pages: string[]
  portraitUrl: string | null
  portraitPages: string[]
}

export interface FullscreenVariant {
  url: string | null
  pages: string[]
}

/** Velger variant for skjermens orientering; faller tilbake til den andre når én mangler. */
export function pickFullscreenVariant(item: FullscreenSource, portrait: boolean): FullscreenVariant {
  const landscape = { url: item.imageUrl, pages: item.pages }
  const upright = { url: item.portraitUrl, pages: item.portraitPages }
  if (portrait) return upright.url ? upright : landscape
  return landscape.url ? landscape : upright
}

/**
 * Total visningstid (sek) for et fullskjerm-element. For dokumenter er
 * durationSeconds PER SIDE; for bilde/video gjelder den hele elementet.
 * Returnerer null når elementet ikke er fullskjerm (rotatorens vanlige logikk).
 */
export function fullscreenItemSeconds(
  item: FullscreenSource & { imageMode: string; durationSeconds: number | null },
  portrait: boolean,
  fallbackSeconds: number
): number | null {
  if (item.imageMode !== "fullskjerm") return null
  const v = pickFullscreenVariant(item, portrait)
  if (v.url && isDeckUrl(v.url) && v.pages.length > 0) {
    return (item.durationSeconds ?? FULLSCREEN_PAGE_SECONDS) * v.pages.length
  }
  return item.durationSeconds ?? fallbackSeconds
}
```

- [ ] **Step 4:** `pnpm vitest run src/lib/content/fullscreen.test.ts` → PASS
- [ ] **Step 5: Commit** `feat(widget): fullskjerm-hjelpere — variantvalg og visningstid`

---

### Task 4: FullscreenMedia-komponent + innplugging i tre rotatorer

**Files:**
- Create: `src/app/widget/_shared/fullscreen-media.tsx`
- Modify: `src/app/widget/nyheter/news-rotator.tsx:351-364, 407-415`
- Modify: `src/app/widget/tilbud/tilbud-rotator.tsx:159-168, 186-187`
- Modify: `src/app/widget/kampanje/kampanje-rotator.tsx:106-115, 131-133`

- [ ] **Step 1: Komponent** (blur-fill = samme to-lags mønster som `news-rotator.tsx:183-188`; dokument uten sider = vente-tilstand, ALDRI iframe):

```tsx
"use client"

import { useEffect, useState } from "react"
import { isDeckUrl } from "@/lib/content/deck"
import { pickFullscreenVariant, FULLSCREEN_PAGE_SECONDS, type FullscreenSource } from "@/lib/content/fullscreen"

/**
 * Fullskjerm-media uten tittel/kicker/ramme: bilde, video eller forhånds-
 * rendrede dokumentsider (PDF/PPT) kant til kant. Feil aspekt fylles med en
 * uskarp cover-kopi bak (aldri svarte striper, aldri beskåret innhold).
 * Dokument uten ferdige sider viser en vente-tilstand — rendres i GitHub
 * Action, aldri iframe på Pi-en.
 */

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/.test(url.toLowerCase().split("?")[0])
}

function BlurFill({ url }: { url: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${url}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(52px) brightness(.55)", transform: "scale(1.2)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${url}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
    </>
  )
}

export function FullscreenMedia({ item, portrait }: { item: FullscreenSource & { durationSeconds: number | null }; portrait: boolean }) {
  const variant = pickFullscreenVariant(item, portrait)
  const url = variant.url
  const deck = isDeckUrl(url)
  const pages = deck ? variant.pages : []
  const perPageMs = (item.durationSeconds ?? FULLSCREEN_PAGE_SECONDS) * 1000
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (pages.length <= 1) return
    const id = setTimeout(() => setPage((p) => (p + 1) % pages.length), perPageMs)
    return () => clearTimeout(id)
  }, [page, pages.length, perPageMs])

  if (!url) return null

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden" }}>
      <style>{"@keyframes grFsFade{from{opacity:0}to{opacity:1}}"}</style>
      {isVideoUrl(url) ? (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video src={url} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      ) : deck ? (
        pages.length > 0 ? (
          <div key={page} style={{ position: "absolute", inset: 0, animation: "grFsFade .5s ease-out" }}>
            <BlurFill url={pages[page % pages.length]} />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.45)", fontSize: 34, fontFamily: "Arial, Helvetica, sans-serif" }}>
            Gjøres klar for skjerm …
          </div>
        )
      ) : (
        <BlurFill url={url} />
      )}
    </div>
  )
}
```

(Bevisst svart bakgrunn — ikke blur-video-bakteppe — for video: to samtidige videoelementer er for tungt for Pi-en.)

- [ ] **Step 2: news-rotator.tsx** — importer `FullscreenMedia` + `fullscreenItemSeconds`. Først i `Card()` (linje 351):

```ts
  if (item.imageMode === "fullskjerm") return <FullscreenMedia item={item} portrait={portrait} />
```

Timer i `NewsRotator` (linje 412):

```ts
    const secs = fullscreenItemSeconds(it, portrait, DEFAULT_SECONDS) ?? it?.durationSeconds ?? SECONDS[it?.type ?? ""] ?? DEFAULT_SECONDS
```

- [ ] **Step 3: tilbud-rotator.tsx** — importer det samme. Ny gren FØRST i render-kjeden (før `item.klubb`, linje 187):

```tsx
      ) : item.imageMode === "fullskjerm" ? (
        <div key={item.id} style={{ ...inset, animation: "grFade .6s ease-out" }}>
          <FullscreenMedia item={item} portrait />
        </div>
```

Timer (linje 165): `const secs = fullscreenItemSeconds(it, true, SECONDS) ?? it?.durationSeconds ?? (it?.isPdf ? 45 : SECONDS)`

- [ ] **Step 4: kampanje-rotator.tsx** — ny gren FØRST (før `item.campaign`, linje 133):

```tsx
          {item.imageMode === "fullskjerm" ? (
            <FullscreenMedia item={item} portrait={false} />
          ) : item.campaign ? (
```

Timer (linje 112): `const secs = fullscreenItemSeconds(it, false, DEFAULT_SECONDS) ?? it?.durationSeconds ?? DEFAULT_SECONDS`

- [ ] **Step 5:** `npx tsc --noEmit` + `pnpm lint` → grønt
- [ ] **Step 6: Commit** `feat(widget): FullscreenMedia — kant-til-kant media i alle tre rotatorer`

---

### Task 5: Preview-støtte (widget/preview + LiveItem-syntetikk)

**Files:**
- Modify: `src/app/widget/preview/page.tsx:22-47, 62-118`
- Modify: `src/app/widget/tilbud/page.tsx:43` (kun nye felt, gjort i Task 2)

- [ ] **Step 1:** `PreviewData` += `portraitUrl?: string | null`, `portraitPages?: string[]`; `imageMode`-typen += `"fullskjerm"`. I `item`-konstruksjonen:

```ts
    imageMode: data.imageMode === "plakat" ? "plakat" : data.imageMode === "liten" ? "liten" : data.imageMode === "fullskjerm" ? "fullskjerm" : "bakgrunn",
    portraitUrl: data.portraitUrl ?? null,
    portraitPages: Array.isArray(data.portraitPages) ? data.portraitPages.filter(Boolean) : [],
```

Ruting trenger ingen endring: stående slide → TilbudRotator (har fullskjerm-gren), liggende → NewsRotator med `portrait={false}` (Card har fullskjerm-gren).

- [ ] **Step 2:** `npx tsc --noEmit` → grønt
- [ ] **Step 3: Commit** `feat(preview): fullskjerm-varianter i live-preview`

---

### Task 6: Admin-UI — fullskjerm-modus med to orienteringsslots

**Files:**
- Create: `src/app/admin/innhold/_components/fullscreen-media-fields.tsx`
- Modify: `src/app/admin/innhold/_components/content-form.tsx` (offerMode, state, save, previewData, betingede seksjoner)
- Modify: `src/app/admin/innhold/_components/edit-content-view.tsx:29-92`

- [ ] **Step 1: Ny komponent** `fullscreen-media-fields.tsx` — to slots med anbefalte mål, filtype-håndtering og mildt aspekt-hint:

```tsx
"use client"

import { useState } from "react"
import { MediaUploader } from "@/components/admin/media-uploader"
import { isDeckUrl, isPptUrl } from "@/lib/content/deck"
import { FileText, X } from "lucide-react"

/**
 * Fullskjerm-modus: to opplastingsslots (liggende + stående) med anbefalte mål.
 * Minst én må fylles; mangler én, vises den andre på begge orienteringer med
 * uskarp utfylling. Aspekt-sjekken er et mildt hint (blokkerer aldri).
 */

const ACCEPT = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-powerpoint",
  "video/mp4", "video/webm", "video/quicktime",
]

const ASPECT_TOLERANCE = 0.1

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/.test(url.toLowerCase().split("?")[0])
}

function Slot({ label, hint, url, onChange, wantW, wantH }: {
  label: string
  hint: string
  url: string | null
  onChange: (url: string | null) => void
  wantW: number
  wantH: number
}) {
  const [ratio, setRatio] = useState<number | null>(null)
  const want = wantW / wantH
  const off = ratio !== null && Math.abs(ratio - want) / want > ASPECT_TOLERANCE
  const deck = isDeckUrl(url)
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
      <div>
        <span className="text-[11px] font-semibold text-zinc-700">{label}</span>
        <p className="text-[10px] text-zinc-400">{hint}</p>
      </div>
      {url ? (
        <div className="relative rounded-xl overflow-hidden border border-zinc-200 group bg-zinc-900">
          {deck ? (
            <div className="w-full h-36 flex items-center justify-center text-white gap-2 text-sm font-semibold">
              <FileText className="w-5 h-5" /> {isPptUrl(url) ? "PowerPoint" : "PDF"}
            </div>
          ) : isVideoUrl(url) ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={url} muted loop autoPlay playsInline className="w-full h-36 object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-36 object-contain"
              onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight) }} />
          )}
          <button onClick={() => { onChange(null); setRatio(null) }} aria-label="Fjern fil"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <MediaUploader maxFiles={1} accept={ACCEPT} onUpload={(files) => { const u = files[0]?.url; if (u) onChange(u) }} />
      )}
      {off && !deck && url && !isVideoUrl(url) && (
        <p className="text-[10px] text-amber-600">Formatet avviker fra {wantW}×{wantH} — vises med uskarp utfylling rundt.</p>
      )}
    </div>
  )
}

export function FullscreenMediaFields({ landscapeUrl, portraitUrl, onLandscape, onPortrait, showBoth, onShowBoth, surface }: {
  landscapeUrl: string | null
  portraitUrl: string | null
  onLandscape: (url: string | null) => void
  onPortrait: (url: string | null) => void
  showBoth: boolean
  onShowBoth: (v: boolean) => void
  surface: "kunde" | "intern"
}) {
  const anyDeck = isDeckUrl(landscapeUrl) || isDeckUrl(portraitUrl)
  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-zinc-600">Fullskjerm-media</label>
      <p className="text-[11px] text-zinc-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        Vises <strong>kant til kant uten tittel eller ramme</strong>. Last opp én fil per orientering for perfekt
        resultat — fyller du bare én, vises den på begge med uskarp utfylling der formatet ikke passer.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Slot label="Liggende skjermer" hint="Anbefalt: 1920×1080 px (16:9) — eller 3840×2160" url={landscapeUrl} onChange={onLandscape} wantW={16} wantH={9} />
        <Slot label="Stående skjermer" hint="Anbefalt: 1080×1920 px (9:16)" url={portraitUrl} onChange={onPortrait} wantW={9} wantH={16} />
      </div>
      {anyDeck && (
        <p className="text-[10px] text-zinc-400">
          PowerPoint: bruk 16:9-lysbilder for liggende; egendefinert 19,05 × 33,87 cm for stående. PDF: eksporter i
          samme forhold som skjermen. <strong className="text-amber-600">Maks 6 sider vises</strong> — sidene gjøres
          klare automatisk etter publisering (tar noen minutter).
        </p>
      )}
      <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
        <input type="checkbox" checked={showBoth} onChange={(e) => onShowBoth(e.target.checked)} className="rounded border-zinc-300" />
        Vis også på {surface === "kunde" ? "interne skjermer" : "kundeskjermene"}
      </label>
    </div>
  )
}
```

- [ ] **Step 2: content-form.tsx** — endringer (alle små):
  1. Import: `FullscreenMediaFields`, og `Monitor`-ikon fra lucide (til modus-knappen trengs ikke ikon — OFFER_MODES er tekst-knapper).
  2. `ContentInitial` += `portraitUrl?: string | null; portraitPages?: string[]; audienceBoth?: boolean`.
  3. `offerMode`-state (linje 173): union += `"fullskjerm"`; init: `initial?.imageMode === "fullskjerm" ? "fullskjerm" : initial?.offer ? "struktur" : initial?.campaign ? "kampanje" : initial?.klubb ? "klubb" : "plakat"`.
  4. `OFFER_MODES` (linje 201): legg til `{ k: "fullskjerm" as const, label: "Fullskjerm (kun media)" }` etter plakat-oppføringen, og utvid literal-typen med `"fullskjerm"`.
  5. Ny state: `const [fsPortraitUrl, setFsPortraitUrl] = useState<string | null>(initial?.portraitUrl ?? null)` og `const [showBoth, setShowBoth] = useState(initial?.audienceBoth ?? false)`.
  6. `const isFullscreen = type === "slide" && offerMode === "fullskjerm"` (ved linje 193-195).
  7. `usesColors` += `&& !isFullscreen`; `usesBody` += `&& !isFullscreen`; `periodRequired` = `type === "slide" && !isKlubb && !isFullscreen` (fullskjerm kan være evigvarende); `defaultDuration`: `isFullscreen && (isDeckUrl(imageUrls[0]) || isDeckUrl(fsPortraitUrl)) ? 8 : (eksisterende)`. Visningstid-hjelpeteksten: når fullskjerm + dokument → «per side».
  8. Tittel-input placeholder (linje 480): `type === "slide" && isFullscreen ? "Internt navn (vises ikke på skjermen)..." : (eksisterende)` + under input, når isFullscreen: `<p className="text-[10px] text-zinc-400">Tittelen er kun til admin-lista — den vises aldri på skjermen.</p>`
  9. Bilde-seksjonen (linje 620): `{usesImage && !isFullscreen && ( ...eksisterende... )}` og ny blokk:

```tsx
          {isFullscreen && (
            <FullscreenMediaFields
              landscapeUrl={imageUrls[0] ?? null}
              portraitUrl={fsPortraitUrl}
              onLandscape={(u) => setImageUrls(u ? [u] : [])}
              onPortrait={setFsPortraitUrl}
              showBoth={showBoth}
              onShowBoth={setShowBoth}
              surface={audience}
            />
          )}
```

  10. `handleSave`-validering (etter linje 352): `if (isFullscreen && !imageUrls[0] && !fsPortraitUrl) { toast.error("Last opp minst én fil (liggende eller stående)"); return }`
  11. `doSave`-payload: `audience: isFullscreen && showBoth ? "begge" : audience`, `portraitUrl: isFullscreen ? fsPortraitUrl : null`, `imageMode: usesImage ? (isFullscreen ? "fullskjerm" : type === "slide" || isMulti ? "plakat" : imageMode) : "bakgrunn"`. NB: `imageUrl`/`imageUrls` sendes som før (liggende-slot = imageUrls[0]).
  12. `previewData` (linje 407): `imageMode`-feltet samme uttrykk som i doSave; += `portraitUrl: isFullscreen ? fsPortraitUrl : null` og `portraitPages: isFullscreen && initial?.portraitPages?.length && fsPortraitUrl === initial?.portraitUrl ? initial.portraitPages : []`.
  13. `isDeck` (linje 318) utvides IKKE (gjelder bare vanlig modus); men import `isDeckUrl` brukes i pkt. 7.

- [ ] **Step 3: edit-content-view.tsx**:
  - body-cast (linje 30): `imageMode?: "plakat" | "bakgrunn" | "liten" | "fullskjerm"`, += `portraitUrl?: string | null; portraitPages?: string[]`, audience-cast: `audience?: string`.
  - Flate-utledning (linje 43):

```ts
  const stored = body.audience === "kunde" || body.audience === "intern" || body.audience === "begge" ? body.audience : audienceForType(item.type as ContentType)
  const audience: Audience = stored === "begge" ? (listHref?.includes("kundeinnhold") ? "kunde" : "intern") : stored
```

  - `initial` += `portraitUrl: body.portraitUrl ?? null`, `portraitPages: Array.isArray(body.portraitPages) ? body.portraitPages.filter(Boolean) : undefined`, `audienceBoth: stored === "begge"`.

- [ ] **Step 4:** `npx tsc --noEmit` + `pnpm lint` → grønt
- [ ] **Step 5: Commit** `feat(admin): Fullskjerm-modus — to orienteringsslots, anbefalte mål, «begge flater»`

---

### Task 7: render-decks — portrait-variant + PDF i fullskjerm

**Files:**
- Modify: `scripts/check-pending-decks.mjs:30-42`
- Modify: `scripts/render-decks.mjs:122-161`

- [ ] **Step 1: check-pending-decks.mjs** — erstatt pending-beregningen (linje 34–39):

```js
// PDF prerendres KUN i fullskjerm-modus (ellers vises PDF som iframe i widgetene).
const deckKind = (u) => {
  const s = String(u || "").toLowerCase().split("?")[0]
  return s.endsWith(".pptx") || s.endsWith(".ppt") ? "ppt" : s.endsWith(".pdf") ? "pdf" : null
}

const pending = (items || []).reduce((n, x) => {
  const b = x.body || {}
  const variants = [
    { url: b.imageUrl, pages: b.pages, renderedFor: b.pagesFor },
    { url: b.portraitUrl, pages: b.portraitPages, renderedFor: b.portraitPagesFor },
  ]
  for (const v of variants) {
    const kind = deckKind(v.url)
    if (!kind) continue
    if (kind === "pdf" && b.imageMode !== "fullskjerm") continue
    const have = Array.isArray(v.pages) && v.pages.length > 0
    if (!have || v.renderedFor !== v.url) n++
  }
  return n
}, 0)
```

- [ ] **Step 2: render-decks.mjs** — legg til etter `pptToPdfBytes` (linje 94):

```js
/** PDF hentes direkte; PPT/PPTX går via LibreOffice. */
async function deckToPdfBytes(url, kind) {
  if (kind === "ppt") return pptToPdfBytes(url)
  return new Uint8Array(await (await fetch(url)).arrayBuffer())
}

const deckKind = (u) => {
  const s = String(u || "").toLowerCase().split("?")[0]
  return s.endsWith(".pptx") || s.endsWith(".ppt") ? "ppt" : s.endsWith(".pdf") ? "pdf" : null
}
```

Erstatt hovedløkka (linje 126–160) — variant-drevet, én PATCH per item:

```js
let rendered = 0
for (const item of items || []) {
  const b = item.body || {}
  const variants = [
    { url: b.imageUrl, pages: b.pages, renderedFor: b.pagesFor, pagesKey: "pages", forKey: "pagesFor", suffix: "" },
    { url: b.portraitUrl, pages: b.portraitPages, renderedFor: b.portraitPagesFor, pagesKey: "portraitPages", forKey: "portraitPagesFor", suffix: "-portrait" },
  ]
  const patch = {}
  for (const v of variants) {
    const kind = deckKind(v.url)
    if (!kind) continue
    // PDF prerendres kun for fullskjerm (plakat-PDF vises fortsatt som iframe).
    if (kind === "pdf" && b.imageMode !== "fullskjerm") continue
    if (Array.isArray(v.pages) && v.pages.length > 0 && v.renderedFor === v.url) {
      console.log(`  – ${item.title}${v.suffix}: allerede rendret (${v.pages.length} sider)`)
      continue
    }
    try {
      const pdfBytes = await deckToPdfBytes(v.url, kind)
      const buffers = await renderPdfBytes(pdfBytes)
      const urls = []
      for (let i = 0; i < buffers.length; i++) {
        urls.push(await uploadPage(`decks/${item.id}${v.suffix}-p${i + 1}.jpg`, buffers[i]))
      }
      patch[v.pagesKey] = urls
      patch[v.forKey] = v.url
      rendered++
      console.log(`  ✓ ${item.title}${v.suffix}: ${urls.length} sider rendret`)
    } catch (err) {
      console.error(`  ✗ ${item.title}${v.suffix}: ${err.message}`)
    }
  }
  if (Object.keys(patch).length > 0) {
    const res = await fetch(`${SB}/rest/v1/content_items?id=eq.${item.id}`, {
      method: "PATCH",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ body: { ...b, ...patch } }),
    })
    if (!res.ok) console.error(`  ✗ ${item.title}: patch ${res.status}: ${await res.text()}`)
  }
}
console.log(`\n✅ ferdig: ${rendered} deck-variant(er) rendret.`)
```

Fjern det gamle `pptItems`-filteret (linje 126–130) og logglinja — items brukes direkte. `Fant …`-loggen kan endres til `console.log(\`Sjekker ${items?.length ?? 0} live slide-item(er)\`)`.

- [ ] **Step 3:** Syntaks-sjekk: `node --check scripts/render-decks.mjs && node --check scripts/check-pending-decks.mjs`
- [ ] **Step 4: Commit** `feat(render-decks): portrait-variant + PDF-prerender for fullskjerm`

---

### Task 8: Verifisering

- [ ] `pnpm vitest run` → alle enhetstester grønne
- [ ] `pnpm lint` → grønt
- [ ] `pnpm build` → grønt
- [ ] Dev-server på EGEN port (3311 — annen agent kan eie 3000): `PORT=3311 pnpm dev`. Playwright-screenshots av `/widget/preview?d=<base64url>&o=portrait|landscape` med syntetisk fullskjerm-payload (bilde-URL med feil aspekt for å se blur-fill), i viewport 1080×1920 og 1920×1080. Verifiser: ingen tittel/kicker/chip, blur-fill synlig, vente-tilstand for deck uten pages.
- [ ] Ærlig statusrapport i PR: hva er verifisert (unit + visuelt via preview) og hva som gjenstår (ekte opplasting PDF/PPT → Action-render → skjerm; bucket-MIME er bekreftet i migrasjon 039).

### Task 9: PR

- [ ] Commit spec + plan (`docs/superpowers/…`) på grenen
- [ ] Push til `origin` (fork) med `-u`, PR → `upstream` base `dev`, norsk beskrivelse med testplan + gjenstående punkter
