"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Ikke innlogget")
  return { supabase, userId: user.id }
}

export async function deleteStore(storeId: string) {
  const { supabase } = await requireUser()
  const { error } = await supabase.from("stores").delete().eq("id", storeId)
  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/stores")
  return { ok: true }
}

export async function createStore(data: {
  name: string
  company_name: string
  org_number: string
  gln: string
  email: string
  city: string
  chain_id: string
}) {
  const { supabase, userId } = await requireUser()

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", userId)
    .single()

  if (!profile) return { ok: false, error: "Bruker ikke funnet" }

  const { error } = await supabase.from("stores").insert({
    ...data,
    tenant_id: profile.tenant_id,
  })

  if (error) return { ok: false, error: error.message }
  revalidatePath("/admin/stores")
  return { ok: true }
}
