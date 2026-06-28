import { createClient } from "@/lib/supabase/server"
import { getStoresGroupedByChain, getTagsWithStores } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { PublishWizard } from "./publish-wizard"
import { ApprovalQueue } from "./approval-queue"

export const dynamic = "force-dynamic"

interface Store { id: string; name: string }

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

  const [chains, tags, pendingApproval, publishLog, readyToPublish] = await Promise.all([
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
  ])

  const chainItems = chains.map((c) => ({ id: c.id, name: c.name, color: c.color }))
  const tagItems = tags.map((t) => ({ id: t.id, name: t.name, color: t.color }))
  const storeItems = chains.flatMap((c) => {
    const stores = (c.stores as unknown as Store[]) ?? []
    return stores.map((s) => ({ id: s.id, name: s.name, chainColor: c.color }))
  })

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Publiser innhold"
        subtitle="Godkjenningskø og publisering"
      />

      <div className="flex-1 p-6 space-y-8">
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
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Publiser innhold</h2>
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
