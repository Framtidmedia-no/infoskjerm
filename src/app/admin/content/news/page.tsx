import { createClient } from "@/lib/supabase/server"
import { getContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Eye, Clock, Store } from "lucide-react"

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

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Nyheter"
        subtitle={`${news.length} nyheter — ${pendingCount} venter godkjenning`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Ny nyhet
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-3">
        {/* Pending approval banner */}
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {pendingCount} nyhet(er) venter godkjenning
                </p>
                <p className="text-xs text-amber-700">Ansatte har sendt inn innhold som trenger din godkjenning</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
              Godkjenn nå
            </Button>
          </div>
        )}

        {news.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-400 text-sm">Ingen nyheter er opprettet ennå.</p>
          </div>
        ) : (
          news.map((item) => {
            const statusCfg = statusConfig[(item.status ?? "draft") as keyof typeof statusConfig] ?? statusConfig.draft
            const author = ((item as unknown as Record<string, unknown>)['users!created_by'] as { full_name: string } | null)?.full_name ?? "Ukjent"
            const created = item.created_at
              ? new Date(item.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
              : "—"
            const validTo = item.valid_to
              ? new Date(item.valid_to).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
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
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">Godkjenn</Button>
                          <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">Avvis</Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
