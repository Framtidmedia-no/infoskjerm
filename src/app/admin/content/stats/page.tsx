import { createClient } from "@/lib/supabase/server"
import { getContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Eye, Clock, BarChart3, Store } from "lucide-react"

export const dynamic = "force-dynamic"

const statusConfig = {
  approved: { label: "Publisert", variant: "success" as const },
  pending_approval: { label: "Venter godkjenning", variant: "warning" as const },
  draft: { label: "Utkast", variant: "secondary" as const },
  rejected: { label: "Avvist", variant: "destructive" as const },
}

export default async function StatsPage() {
  const supabase = await createClient()
  const statsItems = await getContentItems(supabase, "stats")

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Salgstall"
        subtitle={`${statsItems.length} salgstall-innhold`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Nytt salgstall-innhold
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-3">
        {statsItems.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-400 text-sm">Ingen salgstall-innhold er opprettet ennå.</p>
          </div>
        ) : (
          statsItems.map((item) => {
            const statusKey = (item.status ?? "draft") as keyof typeof statusConfig
            const statusCfg = statusConfig[statusKey] ?? statusConfig.draft
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
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
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
