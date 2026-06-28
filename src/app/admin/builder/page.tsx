import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getAllModules, getEnabledModuleKeys } from "@/lib/admin/modules"
import { BuilderRoot } from "./_components/builder-root"
import type { ModulePlacement, ZoneModule } from "@/lib/builder/types"

export const dynamic = "force-dynamic"

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single()

  const tenantId = profile?.tenant_id ?? ""

  const params = await searchParams
  const editId = params.id ?? null

  // Load existing content if ?id= is provided
  let initialName = "Nytt innhold"
  let initialContentItemId: string | null = null
  let initialLayoutId = "fullscreen"
  let initialZones: Record<string, ZoneModule> = {}
  let initialDuration = 15

  if (editId) {
    const { data: item } = await supabase
      .from("content_items")
      .select("id, title, body")
      .eq("id", editId)
      .single()

    if (item) {
      initialContentItemId = item.id
      initialName = item.title ?? "Nytt innhold"
      const body = item.body as Record<string, unknown> | null

      const builderV2 = body?.builder_v2 as
        | { layoutId?: string; zones?: Record<string, ZoneModule>; durationSeconds?: number }
        | undefined

      if (builderV2?.zones) {
        // Native v2 composition
        initialLayoutId = builderV2.layoutId ?? "fullscreen"
        initialZones = builderV2.zones
        initialDuration = builderV2.durationSeconds ?? 15
      } else {
        // Migrate legacy v1 (sequential slides) → put the first module in the
        // fullscreen zone so old content opens cleanly in the new composer.
        const builderV1 = body?.builder_v1 as { placements?: ModulePlacement[] } | undefined
        const first = builderV1?.placements?.[0]
        if (first) {
          initialLayoutId = "fullscreen"
          initialZones = { main: { moduleKey: first.moduleKey, moduleName: first.moduleName, fields: first.fields } }
          initialDuration = first.durationSeconds ?? 15
        }
      }
    }
  }

  const [allModules, enabledKeys] = await Promise.all([
    getAllModules(supabase),
    getEnabledModuleKeys(supabase, tenantId),
  ])

  const availableModules = enabledKeys.size > 0
    ? allModules.filter((m) => enabledKeys.has(m.key))
    : allModules

  return (
    <BuilderRoot
      modules={availableModules}
      tenantId={tenantId}
      userId={user.id}
      initialName={initialName}
      initialContentItemId={initialContentItemId}
      initialLayoutId={initialLayoutId}
      initialZones={initialZones}
      initialDuration={initialDuration}
    />
  )
}
