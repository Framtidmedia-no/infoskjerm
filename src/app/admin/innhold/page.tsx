import { requireRole } from "@/lib/admin/require-role"
import { Topbar } from "@/components/admin/topbar"
import Link from "next/link"
import { Plus } from "lucide-react"
import { ContentListClient, type ContentRow } from "./_components/content-list-client"

export const dynamic = "force-dynamic"

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export default async function ContentListPage() {
  const { supabase } = await requireRole([...AUTHOR_ROLES])

  const [{ data: items }, { data: stores }, { data: tags }] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, type, status, body, valid_from, valid_to, created_at, updated_at, content_targets(target_all, store_id, tag_id)")
      .order("created_at", { ascending: false }),
    supabase.from("stores").select("id, name").order("name"),
    supabase.from("tags").select("id, name").order("name"),
  ])

  const storeName = new Map((stores ?? []).map((s) => [s.id, s.name]))
  const tagName = new Map((tags ?? []).map((t) => [t.id, t.name]))

  const rows: ContentRow[] = (items ?? []).map((it) => {
    const targets = (it.content_targets ?? []) as { target_all: boolean | null; store_id: string | null; tag_id: string | null }[]
    const storeIds = targets.filter((t) => t.store_id).map((t) => t.store_id as string)
    const tagIds = targets.filter((t) => t.tag_id).map((t) => t.tag_id as string)
    let mode: ContentRow["target"]["mode"] = "none"
    if (storeIds.length) mode = "stores"
    else if (tagIds.length) mode = "tags"
    else if (targets.some((t) => t.target_all)) mode = "all"

    const names = mode === "stores"
      ? storeIds.map((id) => storeName.get(id)).filter((x): x is string => !!x)
      : mode === "tags"
        ? tagIds.map((id) => tagName.get(id)).filter((x): x is string => !!x)
        : []

    const body = (it.body ?? {}) as { imageUrl?: string | null }
    return {
      id: it.id,
      title: it.title,
      type: it.type,
      status: it.status,
      imageUrl: body.imageUrl ?? null,
      validFrom: it.valid_from,
      validTo: it.valid_to,
      updatedAt: it.updated_at,
      target: { mode, count: mode === "stores" ? storeIds.length : tagIds.length, names },
      storeIds,
      tagIds,
    }
  })

  // Dynamisk modell: alle publiserte saker vises i ÉN base-mal (campaign 8).
  // «Se på skjerm» forhåndsviser malen med hele rulleringen, ikke per-sak-layout.
  const xiboBaseUrl = process.env.XIBO_API_URL ?? ""
  const baseCampaignId = process.env.XIBO_BASE_CAMPAIGN_ID ?? "8"
  const previewUrl = xiboBaseUrl ? `${xiboBaseUrl}/campaign/${baseCampaignId}/preview` : null

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Innhold"
        subtitle="Nyheter, tilbud og kampanjer til skjermene"
        actions={
          <Link href="/admin/innhold/ny" className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-2 rounded-lg" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Plus className="w-4 h-4" /> Nytt innhold
          </Link>
        }
      />
      <div className="flex-1 p-6 max-w-6xl">
        <ContentListClient items={rows} stores={stores ?? []} tags={tags ?? []} previewUrl={previewUrl} />
      </div>
    </div>
  )
}
