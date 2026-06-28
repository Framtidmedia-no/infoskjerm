import { createClient } from "@/lib/supabase/server"
import { getStoresGroupedByChain } from "@/lib/admin/queries"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Monitor, Mail, Building2, ExternalLink } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Store {
  id: string
  name: string
  company_name: string | null
  city: string | null
  email: string | null
  org_number: string | null
  gln: string | null
  screens: unknown[]
}

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const tagFilter = params.tag ?? null

  const chains = await getStoresGroupedByChain(supabase)

  // If tag filter: fetch store_ids for this tag
  let filteredStoreIds: Set<string> | null = null
  let tagName: string | null = null
  if (tagFilter) {
    const { data: storeTags } = await supabase
      .from("store_tags")
      .select("store_id, tags(name)")
      .eq("tag_id", tagFilter)
    if (storeTags) {
      filteredStoreIds = new Set(storeTags.map(st => st.store_id).filter(Boolean) as string[])
      const firstTag = storeTags[0]?.tags as { name: string } | null
      tagName = firstTag?.name ?? null
    }
  }

  const totalStores = chains.reduce((s, c) => {
    const stores = (c.stores as unknown as Store[]) ?? []
    const visible = filteredStoreIds ? stores.filter(st => filteredStoreIds!.has(st.id)) : stores
    return s + visible.length
  }, 0)

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Butikker"
        subtitle={tagName ? `Viser ${totalStores} butikker med tag: ${tagName}` : `${totalStores} butikker`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" asChild>
              <Link href="/admin/stores/new">Legg til butikk</Link>
            </Button>
          </div>
        }
      />

      {tagName && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3 text-sm bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
            <span className="text-blue-700">Filtrert på tag: <strong>{tagName}</strong></span>
            <Link href="/admin/stores" className="text-blue-500 hover:text-blue-700 underline ml-auto">Vis alle</Link>
          </div>
        </div>
      )}

      {chains.length === 0 ? (
        <div className="flex-1 p-6 flex items-center justify-center">
          <p className="text-zinc-400 text-sm">Ingen kjeder eller butikker er lagt til ennå.</p>
        </div>
      ) : (
        <div className="flex-1 p-6 space-y-6">
          {chains.map((chain) => {
            const allStores = (chain.stores as unknown as Store[]) ?? []
            const stores = filteredStoreIds
              ? allStores.filter(st => filteredStoreIds!.has(st.id))
              : allStores
            if (stores.length === 0) return null
            return (
              <div key={chain.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-1 h-6 rounded-full" style={{ backgroundColor: chain.color }} />
                  <h2 className="font-bold text-zinc-900">{chain.name}</h2>
                  <span className="text-sm text-zinc-400">{stores.length} butikker</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {stores.map((store) => {
                    const screenCount = (store.screens as unknown as unknown[])?.length ?? 0
                    return (
                      <Card key={store.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className={`w-2.5 h-2.5 rounded-full ${screenCount > 0 ? "bg-emerald-500" : "bg-zinc-300"}`} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-zinc-900 text-sm">{store.name}</p>
                                <Badge
                                  className="text-[10px] px-2 py-0"
                                  style={{ backgroundColor: chain.color + "20", color: chain.color, border: `1px solid ${chain.color}40` }}
                                >
                                  {chain.name}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Building2 className="w-3 h-3 text-zinc-400" />
                                <p className="text-xs text-zinc-500">{store.company_name ?? "—"}</p>
                              </div>
                            </div>

                            <div className="hidden lg:flex items-center gap-6">
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Org.nr</p>
                                <p className="text-xs font-mono text-zinc-600">{store.org_number ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">GLN</p>
                                <p className="text-xs font-mono text-zinc-600">{store.gln ?? "—"}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">By</p>
                                <p className="text-xs text-zinc-600">{store.city ?? "—"}</p>
                              </div>
                            </div>

                            <div className="hidden xl:flex items-center gap-1.5">
                              <Mail className="w-3 h-3 text-zinc-400" />
                              <p className="text-xs text-zinc-500">{store.email ?? "—"}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                                <span className="text-xs text-zinc-600">{screenCount} skjerm{screenCount !== 1 ? "er" : ""}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/admin/stores/${store.id}`}>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
