import { formatLastSeen, getLastSignInAtMap, getUsersWithDetails } from "@/lib/admin/queries"
import { requireRole } from "@/lib/admin/require-role"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { createAdminClient } from "@/lib/supabase/server"
import { Topbar } from "@/components/admin/topbar"
import { InviteUserForm, type InviteRole } from "./invite-user-form"
import { UsersList, type UserRow } from "./users-list"
import {
  type UserRole,
  USER_MANAGER_ROLES,
  isStoreScopedRole,
  canAdministerUsers,
  invitableRolesFor,
} from "@/lib/roles"

export const dynamic = "force-dynamic"

const exactSignInFmt = new Intl.DateTimeFormat("nb-NO", {
  timeZone: "Europe/Oslo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

export default async function UsersPage() {
  const { supabase, tenantId, userId, role } = await requireRole(USER_MANAGER_ROLES)
  const { unitLabelPlural } = await getTenantConfig(supabase, tenantId)
  const scoped = isStoreScopedRole(role)
  const canAdminister = canAdministerUsers(role)
  const allowedRoles = invitableRolesFor(role) as InviteRole[]

  let users: Awaited<ReturnType<typeof getUsersWithDetails>>
  let allStores: { id: string; name: string }[]
  // For butikk-scopede admins: kun egne enheter skal vises (ikke lekke navn på
  // butikker en kollega også styrer utenfor mitt scope). null = ingen begrensning.
  let visibleStoreIds: Set<string> | null = null

  // Service role: brukes til butikk-scopet lesing og sist innlogget (auth.users).
  const admin = createAdminClient()

  if (scoped) {
    // Butikk-admin: les via admin-klient etter rolle-gate, scopet til egne enheter.
    // Uavhengig av RLS-drift, og samme mønster som Logg-siden.
    const { data: myStores } = await admin.from("user_stores").select("store_id").eq("user_id", userId)
    const myStoreIds = (myStores ?? []).map((r) => r.store_id)

    visibleStoreIds = new Set(myStoreIds)
    if (myStoreIds.length === 0) {
      users = []
      allStores = []
    } else {
      const { data: storeUsers } = await admin
        .from("user_stores")
        .select("user_id")
        .in("store_id", myStoreIds)
      const scopedUserIds = Array.from(
        new Set([...(storeUsers ?? []).map((r) => r.user_id), userId])
      )
      users = await getUsersWithDetails(admin, tenantId, scopedUserIds)

      const { data: storesData } = await admin
        .from("stores")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .in("id", myStoreIds)
        .order("name")
      allStores = (storesData ?? []) as { id: string; name: string }[]
    }
  } else {
    users = await getUsersWithDetails(supabase, tenantId)
    const { data: storesData } = await supabase.from("stores").select("id, name").eq("tenant_id", tenantId).order("name")
    allStores = (storesData ?? []) as { id: string; name: string }[]
  }

  const lastSignInByUser = await getLastSignInAtMap(admin, users.map((u) => u.id))

  const rows: UserRow[] = users.map((user) => {
    const userRole = (user.role ?? "store_employee") as UserRole
    const userStores = (user.user_stores as unknown as Array<{ stores: { id: string; name: string } | null }>) ?? []
    const visibleStores = userStores
      .map((us) => us.stores)
      .filter((s): s is { id: string; name: string } => !!s && (visibleStoreIds === null || visibleStoreIds.has(s.id)))
    const lastSignInAt = lastSignInByUser.get(user.id) ?? null
    return {
      id: user.id,
      email: user.email,
      displayName: user.full_name ?? user.email ?? "Ukjent",
      role: userRole,
      storeIds: visibleStores.map((s) => s.id),
      storeNames: visibleStores.map((s) => s.name),
      lastSignIn: formatLastSeen(lastSignInAt),
      lastSignInExact: lastSignInAt ? exactSignInFmt.format(new Date(lastSignInAt)) : null,
    }
  })

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Brukere"
        subtitle={`${users.length} bruker${users.length === 1 ? "" : "e"}`}
        actions={<InviteUserForm stores={allStores} allowedRoles={allowedRoles} />}
      />
      <div className="flex-1 p-4 sm:p-6">
        <UsersList
          rows={rows}
          allStores={allStores}
          canAdminister={canAdminister}
          unitLabelPlural={unitLabelPlural}
        />
      </div>
    </div>
  )
}
