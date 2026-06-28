"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return { supabase, userId: user.id }
}

export async function createPlaylist(name: string) {
  const { supabase, userId } = await requireUser()

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", userId)
    .single()

  if (!profile) return { ok: false, error: "Bruker ikke funnet" }

  const { error } = await supabase.from("playlists").insert({
    name: name.trim(),
    tenant_id: profile.tenant_id,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/playlists")
  return { ok: true }
}

export async function deletePlaylist(playlistId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("playlists").delete().eq("id", playlistId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/playlists")
  return { ok: true }
}
