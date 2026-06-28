import { createClient } from "@/lib/supabase/server"
import { getAllContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { BulkApproveBar } from "./_components/bulk-approve-bar"
import { AllContentClient } from "./_components/all-content-client"
import type { ContentListItem } from "./_components/content-item-list-client"

export const dynamic = "force-dynamic"

function fmt(date: string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
}

export default async function ContentPage() {
  const supabase = await createClient()
  const raw = await getAllContentItems(supabase)

  const pendingIds = raw.filter((n) => n.status === "pending_approval").map((n) => n.id)

  const items: ContentListItem[] = raw.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    author: ((item as unknown as Record<string, unknown>)["users!created_by"] as { full_name: string } | null)?.full_name ?? "Ukjent",
    created: fmt(item.created_at as string | null),
    validTo: fmt((item as unknown as { valid_to?: string | null }).valid_to),
    validFrom: null,
    type: item.type,
    showApprove: true,
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Innhold"
        subtitle={`${items.length} elementer totalt — ${pendingIds.length} venter godkjenning`}
        actions={
          <Button size="sm" asChild style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }}>
            <Link href="/admin/content/new" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Opprett nytt innhold
            </Link>
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-4">
        <BulkApproveBar pendingIds={pendingIds} />
        <AllContentClient items={items} />
      </div>
    </div>
  )
}
