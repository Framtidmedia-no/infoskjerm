import { createClient } from "@/lib/supabase/server"
import { getStoresGroupedByChain, getTagsWithStores, getPendingContent } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { PublishWizard } from "./publish-wizard"

export const dynamic = "force-dynamic"

interface Store {
  id: string
  name: string
}

export default async function PublishPage() {
  const supabase = await createClient()

  const [chains, tags, pendingContent] = await Promise.all([
    getStoresGroupedByChain(supabase),
    getTagsWithStores(supabase),
    getPendingContent(supabase),
  ])

  const chainItems = chains.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }))

  const tagItems = tags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
  }))

  const storeItems = chains.flatMap((c) => {
    const stores = (c.stores as unknown as Store[]) ?? []
    return stores.map((s) => ({
      id: s.id,
      name: s.name,
      chainColor: c.color,
    }))
  })

  const contentItems = pendingContent.map((item) => ({
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    created_at: item.created_at,
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar title="Publiser innhold" subtitle="Velg mottakere og innhold" />

      <div className="flex-1 p-6">
        <PublishWizard
          chains={chainItems}
          tags={tagItems}
          stores={storeItems}
          pendingContent={contentItems}
        />
      </div>
    </div>
  )
}
