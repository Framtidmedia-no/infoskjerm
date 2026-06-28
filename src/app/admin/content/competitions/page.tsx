import { createClient } from "@/lib/supabase/server"
import { getContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Plus, Clock, Pencil, Trash2, Eye } from "lucide-react"

export const dynamic = "force-dynamic"

const statusConfig = {
  approved: { label: "Publisert", variant: "success" as const, color: "bg-emerald-50 border-emerald-100" },
  pending_approval: { label: "Venter godkjenning", variant: "warning" as const, color: "bg-amber-50 border-amber-100" },
  draft: { label: "Utkast", variant: "secondary" as const, color: "bg-zinc-50 border-zinc-100" },
  rejected: { label: "Avvist", variant: "destructive" as const, color: "bg-red-50 border-red-100" },
}

export default async function CompetitionsPage() {
  const supabase = await createClient()
  const competitions = await getContentItems(supabase, "competition")

  const activeCount = competitions.filter((c) => c.status === "approved").length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Konkurranser"
        subtitle={`${activeCount} publiserte konkurranser`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Ny konkurranse
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {competitions.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-400 text-sm">Ingen konkurranser er opprettet ennå.</p>
          </div>
        ) : (
          competitions.map((item) => {
            const statusKey = (item.status ?? "draft") as keyof typeof statusConfig
            const cfg = statusConfig[statusKey] ?? statusConfig.draft
            const author = ((item as unknown as Record<string, unknown>)['users!created_by'] as { full_name: string } | null)?.full_name ?? "Ukjent"
            const created = item.created_at
              ? new Date(item.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
              : "—"
            const validFrom = item.valid_from
              ? new Date(item.valid_from).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
              : null
            const validTo = item.valid_to
              ? new Date(item.valid_to).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
              : null

            return (
              <Card key={item.id} className={`border ${cfg.color}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.status === "approved" ? "bg-amber-100" : "bg-zinc-100"}`}>
                      <Trophy className={`w-6 h-6 ${item.status === "approved" ? "text-amber-600" : "text-zinc-400"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-zinc-900 text-lg">{item.title}</h3>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-zinc-400 mt-2">
                        {validFrom && validTo && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {validFrom} – {validTo}
                          </span>
                        )}
                        <span>Opprettet av {author}</span>
                        <span>{created}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
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
