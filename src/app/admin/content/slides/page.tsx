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

export default async function SlidesPage() {
  const supabase = await createClient()
  const raw = await getContentItems(supabase, "slide")

  const activeCount = raw.filter((s) => s.status === "approved").length

  const items: ContentListItem[] = raw.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    author: ((item as unknown as Record<string, unknown>)["users!created_by"] as { full_name: string } | null)?.full_name ?? "Ukjent",
    created: fmt(item.created_at as string | null),
    validFrom: null,
    validTo: null,
    type: "slide",
    showApprove: false,
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Slides"
        subtitle={`${activeCount} publiserte slides`}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/content/new?type=slide" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Ny slide
            </Link>
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-3">
        <ContentItemListClient items={items} emptyMessage="Ingen slides er opprettet ennå." />
      </div>
    </div>
  )
}
