import { createClient } from "@/lib/supabase/server"
import { getContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Eye, Clock, Store } from "lucide-react"
import Link from "next/link"
import { ContentDeleteButton } from "../_components/content-delete-button"
import { ContentApproveButton } from "../_components/content-approve-button"
import { ContentRejectButton } from "../_components/content-reject-button"
import { ContentDuplicateButton } from "../_components/content-duplicate-button"
import { ContentSearchList } from "../_components/content-search-list"
import { BulkApproveBar } from "../_components/bulk-approve-bar"

export const dynamic = "force-dynamic"

const statusConfig = {
  approved: { label: "Publisert", variant: "success" as const },
  pending_approval: { label: "Venter godkjenning", variant: "warning" as const },
  draft: { label: "Utkast", variant: "secondary" as const },
  rejected: { label: "Avvist", variant: "destructive" as const },
}

export default async function NewsPage() {
  const supabase = await createClient()
  const news = await getContentItems(supabase, "news")

  const pendingCount = news.filter((n) => n.status === "pending_approval").length
  const pendingIds = news.filter((n) => n.status === "pending_approval").map((n) => n.id)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Nyheter"
        subtitle={`${news.length} nyheter — ${pendingCount} venter godkjenning`}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/content/new" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Ny nyhet
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-3">
        <BulkApproveBar pendingIds={pendingIds} />

        <ContentSearchList
          items={news}
          emptyMessage="Ingen nyheter er opprettet ennå."
          renderItem={(item) => {
            const statusCfg = statusConfig[(item.status ?? "draft") as keyof typeof statusConfig] ?? statusConfig.draft
            const author = ((item as unknown as Record<string, unknown>)['users!created_by'] as { full_name: string } | null)?.full_name ?? "Ukjent"
            const created = item.created_at
              ? new Date(item.created_at as string).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
              : "—"
            const validTo = (item as unknown as { valid_to?: string | null }).valid_to
              ? new Date((item as unknown as { valid_to: string }).valid_to).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
              : null

            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <Store className="w-3 h-3 text-zinc-400" />
                          <span className="text-xs text-zinc-500">{author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span className="text-xs text-zinc-500">{created}</span>
                        </div>
                        {validTo && (
                          <span className="text-xs text-zinc-400">Utløper {validTo}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === "pending_approval" && (
                        <>
                          <ContentApproveButton itemId={item.id} />
                          <ContentRejectButton itemId={item.id} />
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/preview/${item.id}`} target="_blank">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href={`/admin/builder?id=${item.id}`}>
                          <Pencil className="w-4 h-4" />
                        </Link>
                      </Button>
                      <ContentDuplicateButton itemId={item.id} />
                      <ContentDeleteButton itemId={item.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          }}
        />
      </div>
    </div>
  )
}
