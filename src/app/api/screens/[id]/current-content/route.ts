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

function isScheduledNow(rule: { days?: number[]; start_time?: string; end_time?: string } | null): boolean {
  if (!rule) return true
  const now = new Date()
  const day = now.getDay() // 0=Sunday
  const time = now.toTimeString().slice(0, 5) // "HH:MM"

  if (rule.days && rule.days.length > 0 && !rule.days.includes(day)) return false
  if (rule.start_time && time < rule.start_time) return false
  if (rule.end_time && time > rule.end_time) return false
  return true
}

interface ContentItemRow {
  id: string
  title: string
  module_key: string | null
  body: Record<string, unknown> | null
  status: string | null
  schedule_rule: { days?: number[]; start_time?: string; end_time?: string } | null
  is_priority: boolean
}

interface SlideInternal extends Slide {
  scheduleRule: { days?: number[]; start_time?: string; end_time?: string } | null
  isPriority: boolean
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

  const { data: authData } = await supabase.auth.getUser()
  const hasValidToken = token !== null && (screen as { token?: string | null }).token === token
  const hasAdminSession = !!authData?.user

  if (!hasValidToken && !hasAdminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 1. Check if screen has a playlist
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
        content_items(id, title, module_key, body, status, schedule_rule, is_priority)
      `)
      .eq("playlist_id", playlistId)
      .order("position", { ascending: true })

    const now = new Date().toISOString()
    const slides: SlideInternal[] = []
    for (const item of items ?? []) {
      const ci = item.content_items as ContentItemRow | null
      if (!ci || ci.status !== "live") continue
      const ciRow = ci as ContentItemRow & { valid_from?: string | null; valid_to?: string | null }
      if (ciRow.valid_from && now < ciRow.valid_from) continue
      if (ciRow.valid_to && now > ciRow.valid_to) continue

      const placements = (ci.body as { builder_v1?: { placements?: Array<{ id: string; moduleKey: string; fields: Record<string, unknown>; durationSeconds: number }> } } | null)?.builder_v1?.placements ?? []
      if (placements.length > 0) {
        for (const p of placements) {
          slides.push({
            id: p.id,
            contentItemId: ci.id,
            moduleKey: p.moduleKey,
            fields: p.fields,
            durationSeconds: p.durationSeconds,
            scheduleRule: ci.schedule_rule,
            isPriority: ci.is_priority,
          })
        }
      } else if (ci.module_key) {
        slides.push({
          id: item.id,
          contentItemId: ci.id,
          moduleKey: ci.module_key,
          fields: (ci.body as Record<string, unknown>) ?? {},
          durationSeconds: item.duration_seconds,
          scheduleRule: ci.schedule_rule,
          isPriority: ci.is_priority,
        })
      }
    }

    const scheduled = slides.filter(slide => isScheduledNow(slide.scheduleRule))
    const priority = scheduled.filter(slide => slide.isPriority)
    const finalSlides = priority.length > 0 ? priority : scheduled

    return NextResponse.json({
      slides: finalSlides.map(({ scheduleRule: _sr, isPriority: _ip, ...s }) => s),
    })
  }

  // 2. Fallback: content_targets for this screen
  const storeId = (screen as { store_id: string | null }).store_id
  const chainId = (screen.stores as { chain_id: string } | null)?.chain_id ?? null

  const orFilter = [`target_all.eq.true`]
  if (storeId) orFilter.push(`store_id.eq.${storeId}`)
  if (chainId) orFilter.push(`chain_id.eq.${chainId}`)

  const { data: targets } = await supabase
    .from("content_targets")
    .select(`
      content_item_id,
      target_all, chain_id, store_id,
      content_items!inner(id, title, module_key, body, status, schedule_rule, is_priority)
    `)
    .eq("content_items.status", "live")
    .or(orFilter.join(","))
    .order("content_item_id", { ascending: false })
    .limit(20)

  type Target = {
    content_item_id: string; target_all: boolean | null;
    chain_id: string | null; store_id: string | null;
    content_items: ContentItemRow
  }

  const matching = (targets as unknown as Target[] ?? []).filter(t =>
    t.target_all ||
    (t.store_id && t.store_id === storeId) ||
    (t.chain_id && t.chain_id === chainId)
  )

  const now2 = new Date().toISOString()
  const slides: SlideInternal[] = []
  for (const t of matching) {
    const ci = t.content_items
    const ciDate = ci as ContentItemRow & { valid_from?: string | null; valid_to?: string | null }
    if (ciDate.valid_from && now2 < ciDate.valid_from) continue
    if (ciDate.valid_to && now2 > ciDate.valid_to) continue
    const placements = (ci.body as { builder_v1?: { placements?: Array<{ id: string; moduleKey: string; fields: Record<string, unknown>; durationSeconds: number }> } } | null)?.builder_v1?.placements ?? []
    if (placements.length > 0) {
      for (const p of placements) {
        slides.push({
          id: p.id,
          contentItemId: ci.id,
          moduleKey: p.moduleKey,
          fields: p.fields,
          durationSeconds: p.durationSeconds,
          scheduleRule: ci.schedule_rule,
          isPriority: ci.is_priority,
        })
      }
    } else if (ci.module_key) {
      slides.push({
        id: ci.id,
        contentItemId: ci.id,
        moduleKey: ci.module_key,
        fields: ci.body ?? {},
        durationSeconds: 15,
        scheduleRule: ci.schedule_rule,
        isPriority: ci.is_priority,
      })
    }
  }

  const scheduled = slides.filter(slide => isScheduledNow(slide.scheduleRule))
  const priority = scheduled.filter(slide => slide.isPriority)
  const finalSlides = priority.length > 0 ? priority : scheduled

  return NextResponse.json({
    slides: finalSlides.map(({ scheduleRule: _sr, isPriority: _ip, ...s }) => s),
  })
}
