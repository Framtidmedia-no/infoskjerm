"use server"

import { redirect } from "next/navigation"
import { requireRole } from "@/lib/admin/require-role"
import type { Json } from "@/types/database"

type ContentType = "news" | "competition" | "stats" | "weather" | "slide"

export async function createContentItem(formData: FormData) {
  const { supabase, userId } = await requireRole(["super_admin", "chain_manager", "store_manager", "store_employee"])

  const title = formData.get("title") as string
  const type = formData.get("type") as ContentType
  const templateId = formData.get("template_id") as string | null
  const validFrom = formData.get("valid_from") as string | null || null
  const validTo = formData.get("valid_to") as string | null || null

  if (!title?.trim() || !type) {
    throw new Error("Tittel og type er påkrevd")
  }

  const { data: user } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", userId)
    .single()

  if (!user) throw new Error("Bruker ikke funnet")

  // Default v2 composition per type — opens the builder with a layout and the
  // matching module already placed in the main zone (title pre-filled).
  function fullscreenWith(moduleKey: string, moduleName: string, fields: Record<string, unknown>): Json {
    return JSON.parse(JSON.stringify({
      builder_v2: {
        layoutId: "fullscreen",
        zones: { main: { moduleKey, moduleName, fields } },
        durationSeconds: 15,
      },
    })) as Json
  }

  const emptyComposition = JSON.parse(JSON.stringify({
    builder_v2: { layoutId: "fullscreen", zones: {}, durationSeconds: 15 },
  })) as Json

  const defaultBodyByType: Record<ContentType, Json> = {
    news: fullscreenWith("internal-news", "Intern nyhet", { title: title.trim() }),
    weather: fullscreenWith("weather", "Vær", {}),
    competition: fullscreenWith("competition", "Konkurranse", { title: title.trim() }),
    stats: fullscreenWith("sales-stats", "Salgstall", {}),
    slide: emptyComposition,
  }

  let body: Json = defaultBodyByType[type] ?? emptyComposition

  if (templateId) {
    const { data: template } = await supabase
      .from("content_templates")
      .select("body")
      .eq("id", templateId)
      .single()
    if (template?.body) body = template.body
  }

  const { data: item, error } = await supabase
    .from("content_items")
    .insert({
      title: title.trim(),
      type,
      body,
      status: "draft",
      tenant_id: user.tenant_id,
      created_by: userId,
      valid_from: validFrom,
      valid_to: validTo,
    })
    .select("id")
    .single()

  if (error || !item) throw new Error(error?.message ?? "Kunne ikke opprette innhold")

  redirect(`/admin/builder?id=${item.id}`)
}
