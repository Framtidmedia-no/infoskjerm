import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireRole } from "@/lib/admin/require-role"
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { hasFeature } from "@/lib/tenant/features"
import { NewStoreForm } from "./new-store-form"

export const dynamic = "force-dynamic"

export default async function NewStorePage() {
  const { supabase, tenantId } = await requireRole([
    "super_admin",
    "chain_manager",
    "area_manager",
  ])

  const [{ data: chains }, tenantConfig] = await Promise.all([
    supabase
      .from("chains")
      .select("id, name, color")
      .eq("tenant_id", tenantId)
      .order("name"),
    getTenantConfig(supabase, tenantId),
  ])

  return (
    <div className="flex flex-1 flex-col">
      <Topbar
        title={`Legg til ${tenantConfig.unitLabel.toLowerCase()}`}
        subtitle="Ny enhet i kjeden"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/stores">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Tilbake
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-4 sm:p-6">
        <NewStoreForm
          chains={(chains ?? []) as { id: string; name: string; color: string }[]}
          showGln={hasFeature(tenantConfig.features, "gln")}
          unitLabel={tenantConfig.unitLabel}
        />
      </div>
    </div>
  )
}
