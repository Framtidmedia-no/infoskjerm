import { requireRole } from "@/lib/admin/require-role"
import { getStoresBoard, getAllTags } from "@/lib/admin/queries"
import { fetchScreensByStore } from "@/lib/xibo/screens"
import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { StoresBoard } from "./_components/stores-board"
import type { BoardChain, BoardStore, BoardTag } from "./_components/types"
import type { OpeningHours } from "@/lib/power/schedule"

export const dynamic = "force-dynamic"

interface RawStore {
  id: string
  name: string
  company_name: string | null
  city: string | null
  email: string | null
  org_number: string | null
  gln: string | null
  apningstider: OpeningHours | null
  screens: unknown[] | null
  store_tags: { tags: BoardTag | null }[] | null
}

export default async function StoresPage() {
  const { supabase, tenantId } = await requireRole([
    "super_admin",
    "chain_manager",
    "area_manager",
  ])

  const [rawChains, allTags] = await Promise.all([
    getStoresBoard(supabase, tenantId),
    getAllTags(supabase, tenantId),
  ])

  // Skjermtellinger fra motoren (Xibo) STREAMES: boardet rendres umiddelbart,
  // og promiset resolves i klienten når Xibo-kallet er ferdig — siden venter
  // ikke lenger synkront på et tregt eksternt API. null = kunne ikke hentes.
  const allStores = rawChains.flatMap((c) => ((c.stores as unknown as RawStore[]) ?? []).map((s) => ({ id: s.id, name: s.name })))
  const screenCountsPromise: Promise<Record<string, number> | null> = fetchScreensByStore(allStores)
    .then((m) => Object.fromEntries(Array.from(m, ([id, screens]) => [id, screens.length])))
    .catch(() => null)

  const chains: BoardChain[] = rawChains.map((chain) => {
    const stores: BoardStore[] = ((chain.stores as unknown as RawStore[]) ?? [])
      .map((store) => ({
        id: store.id,
        name: store.name,
        company_name: store.company_name,
        city: store.city,
        email: store.email,
        org_number: store.org_number,
        gln: store.gln,
        apningstider: store.apningstider ?? null,
        tags: (store.store_tags ?? [])
          .map((st) => st.tags)
          .filter((t): t is BoardTag => Boolean(t)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "nb"))

    return { id: chain.id, name: chain.name, color: chain.color, stores }
  })

  const totalStores = chains.reduce((sum, c) => sum + c.stores.length, 0)

  return (
    <div className="flex flex-1 flex-col">
      <Topbar
        title="Enheter"
        subtitle={`${totalStores} enheter`}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/stores/new">Legg til enhet</Link>
          </Button>
        }
      />

      <StoresBoard chains={chains} allTags={allTags as BoardTag[]} screenCountsPromise={screenCountsPromise} />
    </div>
  )
}
