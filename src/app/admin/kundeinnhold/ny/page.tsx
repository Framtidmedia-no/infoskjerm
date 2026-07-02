import { requireRole } from "@/lib/admin/require-role"
import { canTargetAllStores } from "@/lib/roles"
import { ContentForm, type TagOption } from "../../innhold/_components/content-form"
import { loadStoreOptions, loadScreenOptions } from "../../innhold/store-options"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export default async function NewCustomerContentPage({
  searchParams,
}: {
  searchParams: Promise<{ image?: string }>
}) {
  const { supabase, role, tenantId } = await requireRole([...AUTHOR_ROLES])
  const { image } = await searchParams

  const [storeOptions, screenOptions, { data: tags }] = await Promise.all([
    loadStoreOptions(supabase, tenantId),
    loadScreenOptions(supabase, tenantId),
    supabase.from("tags").select("id, name, color").eq("tenant_id", tenantId).order("name"),
  ])

  return <ContentForm stores={storeOptions} tags={(tags ?? []) as TagOption[]} screens={screenOptions} audience="kunde" prefillImage={image} canTargetAll={canTargetAllStores(role)} />
}
