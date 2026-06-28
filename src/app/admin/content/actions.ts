"use server"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export async function deleteContentItem(id: string) {
  const supabase = await createClient()
  await supabase.from("content_items").delete().eq("id", id)
  revalidatePath("/admin/content")
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/competitions")
  revalidatePath("/admin/content/stats")
  revalidatePath("/admin/content/slides")
  revalidatePath("/admin/content/weather")
}

export async function quickApprove(id: string) {
  const supabase = await createClient()
  await supabase.from("content_items").update({ status: "approved" }).eq("id", id)
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/stats")
}

export async function rejectContentItem(id: string) {
  const supabase = await createClient()
  await supabase.from("content_items").update({ status: "rejected" }).eq("id", id)
  revalidatePath("/admin/content/news")
  revalidatePath("/admin/content/stats")
}
