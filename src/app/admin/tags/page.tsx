import { createClient } from "@/lib/supabase/server"
import { getTagsWithStores } from "@/lib/admin/queries"
import { requireRole } from "@/lib/admin/require-role"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tag, Plus, Pencil } from "lucide-react"
import { TagDeleteButton } from "./tag-delete-button"
import { TagFormDialog } from "./tag-form-dialog"
import { TagManageStoresDialog } from "./tag-manage-stores-dialog"

export const dynamic = "force-dynamic"

interface StoreTagStore {
  id: string
  name: string
}

interface StoreTag {
  stores: StoreTagStore | null
}

interface StoreRow {
  id: string
  name: string
  chains: { name: string } | null
}

export default async function TagsPage() {
  await requireRole(["super_admin", "chain_manager"])
  const supabase = await createClient()
  const tags = await getTagsWithStores(supabase)

  const { data: storesData } = await supabase
    .from("stores")
    .select("id, name, chains(name)")
    .order("name")

  const allStores = (storesData as unknown as StoreRow[] ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    chainName: s.chains?.name ?? "Ingen kjede",
  }))

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Tags"
        subtitle="Grupper enheter for enkel publisering"
        actions={
          <TagFormDialog
            mode="create"
            trigger={
              <Button size="sm" asChild>
                <span className="cursor-pointer flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Ny tag
                </span>
              </Button>
            }
          />
        }
      />

      <div className="flex-1 p-6">
        <div className="mb-4">
          <p className="text-sm text-zinc-500">
            Tags lar deg publisere innhold til grupper av enheter på tvers av kjeder — f.eks. alle enheter på Sunnmøre, eller alle storby-enheter.
          </p>
        </div>

        {tags.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-zinc-400 text-sm">Ingen tags er opprettet ennå.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {tags.map((tag) => {
              const storeTags = (tag.store_tags as unknown as StoreTag[]) ?? []
              const storeCount = storeTags.length
              const storeNames = storeTags
                .map((st) => st.stores?.name)
                .filter((n): n is string => Boolean(n))
              const storeIds = storeTags
                .map((st) => st.stores?.id)
                .filter((id): id is string => Boolean(id))

              return (
                <Card key={tag.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: tag.color + "20" }}
                        >
                          <Tag className="w-5 h-5" style={{ color: tag.color }} />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900">{tag.name}</p>
                          <p className="text-xs text-zinc-500">{storeCount} enheter</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <TagFormDialog
                          mode="edit"
                          tagId={tag.id}
                          initialName={tag.name}
                          initialColor={tag.color}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" asChild>
                              <span><Pencil className="w-3.5 h-3.5" /></span>
                            </Button>
                          }
                        />
                        <TagDeleteButton tagId={tag.id} />
                      </div>
                    </div>

                    {storeNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {storeNames.map((storeName) => (
                          <span
                            key={storeName}
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: tag.color + "15", color: tag.color }}
                          >
                            {storeName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">Ingen enheter lagt til ennå</p>
                    )}

                    <TagManageStoresDialog
                      tagId={tag.id}
                      tagName={tag.name}
                      initialStoreIds={storeIds}
                      allStores={allStores}
                    />
                  </CardContent>
                </Card>
              )
            })}

            {/* Add new tag card */}
            <TagFormDialog
              mode="create"
              trigger={
                <Card className="border-dashed border-2 hover:border-zinc-300 transition-colors cursor-pointer">
                  <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-40 text-center">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center mb-3">
                      <Plus className="w-5 h-5 text-zinc-400" />
                    </div>
                    <p className="text-sm font-medium text-zinc-400">Legg til tag</p>
                    <p className="text-xs text-zinc-300 mt-1">F.eks. VESTLAND, KYST, KAMPANJE</p>
                  </CardContent>
                </Card>
              }
            />
          </div>
        )}
      </div>
    </div>
  )
}
