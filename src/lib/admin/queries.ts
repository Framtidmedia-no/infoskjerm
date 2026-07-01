import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export type AdminSupabase = SupabaseClient<Database>

export function formatLastSeen(timestamp: string | null): string {
  if (!timestamp) return 'Aldri'
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Akkurat nå'
  if (minutes < 60) return `${minutes} min siden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} time${hours === 1 ? '' : 'r'} siden`
  const days = Math.floor(hours / 24)
  return `${days} dag${days === 1 ? '' : 'er'} siden`
}

export function getScreenStatusColor(status: string | null, lastHeartbeat: string | null): 'green' | 'yellow' | 'red' {
  if (status === 'inactive') return 'red'
  if (!lastHeartbeat) return 'red'
  const minutesSince = (Date.now() - new Date(lastHeartbeat).getTime()) / 60_000
  if (minutesSince < 3) return 'green'
  if (minutesSince < 15) return 'yellow'
  return 'red'
}

export interface AdminStats {
  onlineScreens: number
  totalScreens: number
  pendingApproval: number
  totalStores: number
  liveContent: number
}

export async function getAdminStats(supabase: AdminSupabase, tenantId: string): Promise<AdminStats> {
  const [screensResult, pendingResult, storesResult, liveResult] = await Promise.all([
    supabase.from('screens').select('id, last_heartbeat, status').eq('tenant_id', tenantId),
    supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending_approval'),
    supabase.from('stores').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('content_items').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'live'),
  ])

  const screens = screensResult.data ?? []
  const onlineScreens = screens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) !== 'red'
  ).length

  return {
    onlineScreens,
    totalScreens: screens.length,
    pendingApproval: pendingResult.count ?? 0,
    totalStores: storesResult.count ?? 0,
    liveContent: liveResult.count ?? 0,
  }
}

export interface ChainOverviewItem {
  name: string
  color: string
  storeCount: number
  totalScreens: number
  onlineScreens: number
}

export async function getChainOverview(supabase: AdminSupabase, tenantId: string): Promise<ChainOverviewItem[]> {
  const { data: chains } = await supabase
    .from('chains')
    .select('id, name, color, stores(id, screens(id, status, last_heartbeat))')
    .eq('tenant_id', tenantId)
    .order('name')

  if (!chains) return []

  return chains.map((chain) => {
    const stores = (chain.stores as unknown as Array<{ id: string; screens: Array<{ id: string; status: string | null; last_heartbeat: string | null }> }>) ?? []
    const screens = stores.flatMap((s) => s.screens ?? [])
    const onlineScreens = screens.filter(
      (s) => getScreenStatusColor(s.status, s.last_heartbeat) !== 'red'
    ).length

    return {
      name: chain.name,
      color: chain.color,
      storeCount: stores.length,
      totalScreens: screens.length,
      onlineScreens,
    }
  })
}

export async function getScreensWithStore(supabase: AdminSupabase, tenantId: string) {
  const { data, error } = await supabase
    .from('screens')
    .select(`
      id, name, token, status, last_heartbeat, last_seen_at, app_info, pending_command, power_state,
      stores(
        id, name,
        chains(id, name, color)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getStoresGroupedByChain(supabase: AdminSupabase, tenantId: string) {
  const { data: chains } = await supabase
    .from('chains')
    .select('id, name, color, stores(id, name, company_name, city, email, org_number, gln, screens(id))')
    .eq('tenant_id', tenantId)
    .order('name')

  return chains ?? []
}

export async function getStoresBoard(supabase: AdminSupabase, tenantId: string) {
  const { data: chains } = await supabase
    .from('chains')
    .select(
      'id, name, color, stores(id, name, company_name, city, email, org_number, gln, screens(id), store_tags(tags(id, name, color)))'
    )
    .eq('tenant_id', tenantId)
    .order('name')

  return chains ?? []
}

export async function getAllTags(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('tags')
    .select('id, name, color')
    .eq('tenant_id', tenantId)
    .order('name')

  return data ?? []
}

export async function getTagsWithStores(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('tags')
    .select('id, name, color, store_tags(stores(id, name))')
    .eq('tenant_id', tenantId)
    .order('name')

  return data ?? []
}

export async function getUsersWithDetails(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('users')
    .select(`
      id, email, full_name, role,
      chains(id, name, color),
      user_stores(stores(id, name))
    `)
    .eq('tenant_id', tenantId)
    .order('full_name')

  return data ?? []
}

export async function getContentItems(
  supabase: AdminSupabase,
  tenantId: string,
  type: Database['public']['Enums']['content_type']
) {
  const { data } = await supabase
    .from('content_items')
    .select(`
      id, title, status, type, created_at, valid_from, valid_to,
      users!created_by(full_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('type', type)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getAllContentItems(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('content_items')
    .select(`
      id, title, status, type, created_at, valid_from, valid_to,
      users!created_by(full_name)
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function getPlaylistsWithItems(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('playlists')
    .select(`
      id, name,
      playlist_items(
        id, position, duration_seconds,
        content_items(id, title, type)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('name')

  return data ?? []
}

export async function getPendingContent(supabase: AdminSupabase, tenantId: string) {
  const { data } = await supabase
    .from('content_items')
    .select(`
      id, title, type, status, created_at,
      users!created_by(full_name)
    `)
    .eq('tenant_id', tenantId)
    .in('status', ['draft', 'pending_approval', 'approved'])
    .order('created_at', { ascending: false })

  return data ?? []
}
