import { createClient } from "@/lib/supabase/server"
import { getStoresGroupedByChain, getTagsWithStores } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { PublishWizard } from "./publish-wizard"
import { ApprovalQueue } from "./approval-queue"
import { Globe, Tag, Building2, LayoutGrid, Radio } from "lucide-react"

export const dynamic = "force-dynamic"

interface Store { id: string; name: string }

const typeLabels: Record<string, string> = {
  news: "Nyhet", competition: "Konkurranse", stats: "Salgstall",
  weather: "Vær", slide: "Slide",
}

export default async function PublishPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  const role = profile?.role ?? "store_employee"
  const canApprove = role === "super_admin" || role === "chain_manager"

  const [chains, tags, pendingApproval, publishLog, readyToPublish, liveContent] = await Promise.all([
    getStoresGroupedByChain(supabase),
    getTagsWithStores(supabase),
    supabase
      .from("content_items")
      .select("id, title, type, status, created_at")
      .eq("status", "pending_approval")
      .order("created_at", { ascending: false }),
    supabase
      .from("publish_log")
      .select("id, content_item_id, action, created_at, snapshot")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("content_items")
      .select("id, title, type, status, created_at")
      .in("status", ["draft", "approved"])
      .order("created_at", { ascending: false })
      .limit(50),
    // Live innhold med targets
    supabase
      .from("content_items")
      .select(`
        id, title, type, created_at,
        content_targets(
          target_all, chain_id, store_id,
          chains(name),
          stores(name)
        )
      `)
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  const chainItems = chains.map((c) => ({ id: c.id, name: c.name, color: c.color }))
  const tagItems = tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))
  const storeItems = chains.flatMap((c) => {
    const stores = (c.stores as unknown as Store[]) ?? []
    return stores.map((s) => ({ id: s.id, name: s.name, chainColor: c.color }))
  })

  type ContentTarget = {
    target_all: boolean | null
    chain_id: string | null
    store_id: string | null
    chains: { name: string } | null
    stores: { name: string } | null
  }
  type LiveItem = {
    id: string
    title: string
    type: string
    created_at: string | null
    content_targets: ContentTarget[]
  }

  const liveItems = (liveContent.data ?? []) as unknown as LiveItem[]

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Publiser innhold"
        subtitle="Godkjenningskø og publisering"
      />

      <div className="flex-1 p-6 space-y-8">
        {/* Live nå */}
        {liveItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Radio className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Live nå</h2>
              <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">{liveItems.length} elementer</span>
            </div>
            <div className="space-y-2">
              {liveItems.map((item) => {
                const targets = item.content_targets ?? []
                const isAll = targets.some(t => t.target_all)
                const chainNames = [...new Set(targets.filter(t => t.chains).map(t => t.chains!.name))]
                const storeNames = [...new Set(targets.filter(t => t.stores).map(t => t.stores!.name))]

                return (
                  <div key={item.id} className="flex items-center gap-4 bg-white border border-zinc-100 rounded-xl px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 truncate">{item.title}</p>
                      <p className="text-xs text-zinc-400">{typeLabels[item.type] ?? item.type}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 flex-shrink-0">
                      {isAll ? (
                        <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                          <Globe className="w-3 h-3" />Alle enheter
                        </span>
                      ) : chainNames.length > 0 ? (
                        chainNames.map(n => (
                          <span key={n} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            <Building2 className="w-3 h-3" />{n}
                          </span>
                        ))
                      ) : storeNames.length > 0 ? (
                        storeNames.slice(0, 3).map(n => (
                          <span key={n} className="flex items-center gap-1 bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">
                            <LayoutGrid className="w-3 h-3" />{n}
                          </span>
                        ))
                      ) : (
                        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                          <Tag className="w-3 h-3" />Tags
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Approval queue */}
        <ApprovalQueue
          pendingItems={(pendingApproval.data ?? []).map((i) => ({ id: i.id, title: i.title, type: i.type, status: i.status, created_at: i.created_at }))}
          publishLog={(publishLog.data ?? []).map((l) => ({
            id: l.id,
            content_item_id: l.content_item_id,
            action: l.action,
            created_at: l.created_at,
            snapshot: l.snapshot as Record<string, unknown>,
          }))}
          canApprove={canApprove}
        />

        {/* Publish wizard */}
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Send innhold til skjerm</h2>
          <PublishWizard
            chains={chainItems}
            tags={tagItems}
            stores={storeItems}
            pendingContent={(readyToPublish.data ?? []).map((i) => ({ id: i.id, title: i.title, type: i.type, status: i.status, created_at: i.created_at }))}
          />
        </div>
      </div>
    </div>
  )
}
