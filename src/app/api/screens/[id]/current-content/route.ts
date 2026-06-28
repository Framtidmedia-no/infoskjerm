import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Find content_targets that match this screen (via store, chain, or target_all)
  // First get screen info
  const { data: screen } = await supabase
    .from("screens")
    .select("id, store_id, stores(chain_id)")
    .eq("id", id)
    .single()

  if (!screen) return NextResponse.json({ content: null })

  const storeId = screen.store_id
  const chainId = (screen.stores as { chain_id: string } | null)?.chain_id ?? null

  // Find live content targeting this screen
  const { data: targets } = await supabase
    .from("content_targets")
    .select(`
      content_item_id,
      target_all,
      chain_id,
      store_id,
      content_items!inner (
        id, title, type, status, published_at
      )
    `)
    .eq("content_items.status", "live")
    .order("content_item_id", { ascending: false })
    .limit(20)

  if (!targets || targets.length === 0) return NextResponse.json({ content: null })

  // Find best match
  type Target = {
    content_item_id: string
    target_all: boolean | null
    chain_id: string | null
    store_id: string | null
    content_items: {
      id: string
      title: string
      type: string
      status: string | null
      published_at: string | null
    }
  }

  const matching = (targets as unknown as Target[]).find(t =>
    t.target_all ||
    (t.store_id && t.store_id === storeId) ||
    (t.chain_id && t.chain_id === chainId)
  )

  return NextResponse.json({ content: matching?.content_items ?? null })
}
