import { requireSuperAdmin } from "@/lib/admin/require-role"
import { listAllTenants } from "@/lib/admin/tenants"
import { TenantsClient } from "./tenants-client"

export const dynamic = "force-dynamic"

export default async function TenantsPage() {
  await requireSuperAdmin()
  const tenants = await listAllTenants()

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 mb-1">Tenants</h1>
      <p className="text-zinc-500 mb-6">
        Opprett, rediger og styr livssyklusen til kunde-organisasjoner.
      </p>
      <TenantsClient tenants={tenants} />
    </div>
  )
}
