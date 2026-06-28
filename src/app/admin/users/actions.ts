"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

type UserRole = "super_admin" | "chain_manager" | "store_manager" | "store_employee"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return { supabase, userId: user.id }
}

export async function deleteUser(userId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("users").delete().eq("id", userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/users")
  return { ok: true }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { supabase } = await requireUser()
  const { error } = await supabase
    .from("users")
    .update({ role })
    .eq("id", userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/users")
  return { ok: true }
}
