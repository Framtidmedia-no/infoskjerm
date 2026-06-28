import { createClient } from "@/lib/supabase/server"
import { getContentItems } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { CloudSun, Plus } from "lucide-react"
import Link from "next/link"
import { ContentItemListClient } from "../_components/content-item-list-client"
import type { ContentListItem } from "../_components/content-item-list-client"

export const dynamic = "force-dynamic"

function fmt(date: string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
}

export default async function WeatherPage() {
  const supabase = await createClient()
  const raw = await getContentItems(supabase, "weather")

  const items: ContentListItem[] = raw.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    author: ((item as unknown as Record<string, unknown>)["users!created_by"] as { full_name: string } | null)?.full_name ?? "Ukjent",
    created: fmt(item.created_at as string | null),
    validFrom: null,
    validTo: null,
    type: "weather",
    showApprove: false,
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Vær"
        subtitle="Automatisk yr.no-data basert på enhetens koordinater"
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/content/new?type=weather" className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              Nytt vær-innhold
            </Link>
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <CloudSun className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Automatisk værhenting fra yr.no</p>
            <p className="text-xs text-blue-700 mt-0.5">Skjermene henter vær automatisk basert på GPS-koordinatene til hver enhet. Oppdateres hver 30. minutt. API-kobling aktiveres i neste fase.</p>
          </div>
        </div>
        <ContentItemListClient items={items} emptyMessage="Ingen vær-innhold er opprettet ennå." />
      </div>
    </div>
  )
}
