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
