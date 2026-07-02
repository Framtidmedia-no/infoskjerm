import { requireRole } from "@/lib/admin/require-role"
import type { StoreOption, ScreenOption } from "./_components/content-form"

/**
 * Loads store options including each store's tag ids, so the content form can
 * show a live "→ vises på N butikker" reach count for tag-based targeting.
 * Shared by the new/edit content pages (internal + customer).
 */

type AdminSupabase = Awaited<ReturnType<typeof requireRole>>["supabase"]

export async function loadStoreOptions(supabase: AdminSupabase, tenantId: string): Promise<StoreOption[]> {
  const [{ data: stores }, { data: storeTags }] = await Promise.all([
    supabase.from("stores").select("id, name, city, chains(name)").eq("tenant_id", tenantId).order("name"),
    supabase.from("store_tags").select("store_id, tag_id"),
  ])
  const tagsByStore = new Map<string, string[]>()
  for (const r of storeTags ?? []) {
    if (!r.store_id || !r.tag_id) continue
    const arr = tagsByStore.get(r.store_id) ?? []
    arr.push(r.tag_id)
    tagsByStore.set(r.store_id, arr)
  }
  return (stores ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    chain: (s.chains as { name: string } | null)?.name ?? null,
    city: s.city,
    tagIds: tagsByStore.get(s.id) ?? [],
  }))
}

/**
 * Loads the tenant's screens for the "Skjermer" target mode (per-screen
 * publishing). The form filters these against the caller's visible stores, so
 * store-scoped roles only ever see their own stores' screens.
 */
export async function loadScreenOptions(supabase: AdminSupabase, tenantId: string): Promise<ScreenOption[]> {
  const { data } = await supabase
    .from("screens")
    .select("id, name, store_id, flate, avdeling")
    .eq("tenant_id", tenantId)
    .order("name")
  // flate/avdeling (037) er ikke i den genererte typen ennå → smalt cast.
  const screens = (data ?? []) as unknown as { id: string; name: string; store_id: string; flate?: string | null; avdeling?: string | null }[]
  return screens.map((s) => ({
    id: s.id,
    name: s.name,
    storeId: s.store_id,
    flate: s.flate === "intern" ? ("intern" as const) : ("kunde" as const),
    avdeling: s.avdeling || "felles",
  }))
}
