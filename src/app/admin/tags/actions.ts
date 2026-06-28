"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return supabase
}

export async function deleteTag(tagId: string) {
  const supabase = await requireUser()
  const { error } = await supabase.from("tags").delete().eq("id", tagId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/tags")
  return { ok: true }
}

export async function createTag(name: string, color: string) {
  const supabase = await requireUser()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Ikke innlogget" }

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single()

  if (!profile) return { ok: false, error: "Bruker ikke funnet" }

  const { error } = await supabase.from("tags").insert({
    name: name.trim().toUpperCase(),
    color,
    tenant_id: profile.tenant_id,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/tags")
  return { ok: true }
}

export async function updateTag(tagId: string, name: string, color: string) {
  const supabase = await requireUser()
  const { error } = await supabase
    .from("tags")
    .update({ name: name.trim().toUpperCase(), color })
    .eq("id", tagId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/tags")
  return { ok: true }
}
