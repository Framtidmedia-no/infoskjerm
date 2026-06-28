import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getAllModules, getEnabledModuleKeys } from "@/lib/admin/modules"
import { BuilderRoot } from "./_components/builder-root"

export const dynamic = "force-dynamic"

export default async function BuilderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single()

  const tenantId = profile?.tenant_id ?? ""

  const [allModules, enabledKeys] = await Promise.all([
    getAllModules(supabase),
    getEnabledModuleKeys(supabase, tenantId),
  ])

  // Show only enabled modules (or all if none are enabled yet)
  const availableModules = enabledKeys.size > 0
    ? allModules.filter((m) => enabledKeys.has(m.key))
    : allModules

  return (
    <BuilderRoot
      modules={availableModules}
      tenantId={tenantId}
      userId={user.id}
    />
  )
}
