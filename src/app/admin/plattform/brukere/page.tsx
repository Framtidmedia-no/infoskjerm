import { getCrossTenantUsers } from "@/lib/admin/cross-tenant-queries"
import { ROLE_LABELS, type UserRole } from "@/lib/roles"
import { SoftTable, SoftTd, SoftTh, SoftThead, SoftTr } from "@/components/ui/soft-table"

function roleLabel(role: string): string {
  return ROLE_LABELS[role as UserRole] ?? role
}

export default async function PlattformBrukerePage() {
  const users = await getCrossTenantUsers()

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 mb-1">Brukere</h1>
      <p className="text-zinc-500 mb-6">
        Alle brukere på tvers av tenants ({users.length}).
      </p>

      <SoftTable>
        <SoftThead>
          <SoftTh>Tenant</SoftTh>
          <SoftTh>Navn / E-post</SoftTh>
          <SoftTh>Rolle</SoftTh>
        </SoftThead>
        <tbody>
          {users.map((u, idx) => (
            <SoftTr key={u.id} index={idx}>
              <SoftTd className="text-zinc-700">{u.tenantName}</SoftTd>
              <SoftTd>
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-100 font-display text-sm font-bold text-zinc-600">
                    {(u.fullName || u.email || "?").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900">{u.fullName || "—"}</p>
                    <p className="text-xs text-zinc-400">{u.email}</p>
                  </div>
                </div>
              </SoftTd>
              <SoftTd>
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                  {roleLabel(u.role)}
                </span>
              </SoftTd>
            </SoftTr>
          ))}
        </tbody>
      </SoftTable>
    </div>
  )
}
