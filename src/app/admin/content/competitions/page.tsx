import { createClient } from "@/lib/supabase/server"
import { getContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { ContentItemListClient } from "../_components/content-item-list-client"
import type { ContentListItem } from "../_components/content-item-list-client"

export const dynamic = "force-dynamic"

function fmt(date: string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
}

export default async function CompetitionsPage() {
  const supabase = await createClient()
  const raw = await getContentItems(supabase, "competition")

  const activeCount = raw.filter((c) => c.status === "approved").length

  const items: ContentListItem[] = raw.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    author: ((item as unknown as Record<string, unknown>)["users!created_by"] as { full_name: string } | null)?.full_name ?? "Ukjent",
    created: fmt(item.created_at as string | null),
    validFrom: fmt((item as unknown as { valid_from?: string | null }).valid_from),
    validTo: fmt((item as unknown as { valid_to?: string | null }).valid_to),
    type: "competition",
    showApprove: false,
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Konkurranser"
        subtitle={`${activeCount} publiserte konkurranser`}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/content/new?type=competition" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Ny konkurranse
            </Link>
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-4">
        <ContentItemListClient items={items} emptyMessage="Ingen konkurranser er opprettet ennå." />
      </div>
    </div>
  )
}
