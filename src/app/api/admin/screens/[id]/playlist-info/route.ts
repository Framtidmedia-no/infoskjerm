import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data } = await supabase
    .from("screen_playlists")
    .select("playlist_id, playlists(name)")
    .eq("screen_id", id)
    .order("priority", { ascending: false })
    .limit(1)
    .single()

  if (!data) return NextResponse.json({ playlistName: null })

  const playlistName = (data.playlists as { name: string } | null)?.name ?? null
  return NextResponse.json({ playlistName })
}
