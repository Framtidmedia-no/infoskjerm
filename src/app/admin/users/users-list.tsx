"use client"

import { useMemo, useState } from "react"
import { Search, Shield, Building2, LayoutGrid, UserCircle, Network, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { SoftTable, SoftTd, SoftTh, SoftThead, SoftTr } from "@/components/ui/soft-table"
import { UserDeleteButton } from "./user-delete-button"
import { UserRoleSelect } from "./user-role-select"
import { UserStoreAccess } from "./user-store-access"
import { type UserRole, ROLE_LABELS } from "@/lib/roles"

// Roles whose access is scoped to specific stores
const STORE_SCOPED: UserRole[] = ["area_manager", "store_manager", "store_employee"]

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  super_admin: { label: ROLE_LABELS.super_admin, icon: Shield, color: "text-violet-700", bg: "bg-violet-50" },
  chain_manager: { label: ROLE_LABELS.chain_manager, icon: Building2, color: "text-blue-700", bg: "bg-blue-50" },
  area_manager: { label: ROLE_LABELS.area_manager, icon: Network, color: "text-indigo-700", bg: "bg-indigo-50" },
  store_manager: { label: ROLE_LABELS.store_manager, icon: LayoutGrid, color: "text-emerald-700", bg: "bg-emerald-50" },
  store_employee: { label: ROLE_LABELS.store_employee, icon: UserCircle, color: "text-zinc-600", bg: "bg-zinc-50" },
}

const ROLE_ORDER: UserRole[] = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"]

export interface UserRow {
  id: string
  email: string | null
  displayName: string
  role: UserRole
  storeIds: string[]
  storeNames: string[]
  /** Ferdig formatert («2 timer siden» / «Aldri») — beregnes på serveren. */
  lastSignIn: string
  lastSignInExact: string | null
}

interface UsersListProps {
  rows: UserRow[]
  allStores: { id: string; name: string }[]
  canAdminister: boolean
  unitLabelPlural: string
}

function AccessCell({
  row,
  allStores,
  editable,
  unitLabelPlural,
}: {
  row: UserRow
  allStores: { id: string; name: string }[]
  editable: boolean
  unitLabelPlural: string
}) {
  if (row.role === "super_admin" || row.role === "chain_manager") {
    return <span className="text-xs text-zinc-500">Alle {unitLabelPlural.toLowerCase()}</span>
  }
  if (STORE_SCOPED.includes(row.role)) {
    if (editable) {
      return <UserStoreAccess userId={row.id} allStores={allStores} currentStoreIds={row.storeIds} />
    }
    return (
      <span className="text-xs text-zinc-600">
        {row.storeNames.length > 0 ? row.storeNames.join(", ") : `Ingen ${unitLabelPlural.toLowerCase()}`}
      </span>
    )
  }
  return <span className="text-xs text-zinc-400">Ingen tilgang satt</span>
}

export function UsersList({ rows, allStores, canAdminister, unitLabelPlural }: UsersListProps) {
  const [search, setSearch] = useState("")
  const [activeRole, setActiveRole] = useState<UserRole | "all">("all")

  const rolesPresent = useMemo(
    () => ROLE_ORDER.filter((r) => rows.some((row) => row.role === r)),
    [rows]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (activeRole !== "all" && row.role !== activeRole) return false
      if (!q) return true
      return [row.displayName, row.email ?? "", ...row.storeNames].some((v) =>
        v.toLowerCase().includes(q)
      )
    })
  }, [rows, search, activeRole])

  const hasFilters = search.trim() !== "" || activeRole !== "all"

  return (
    <div className="space-y-4">
      {/* Søk + rollefilter — kommandofelt */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-zinc-200/80 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk på navn, e-post eller enhet…"
            className="h-9 w-full rounded-xl border border-transparent bg-zinc-50 pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-[var(--brand-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-primary)]/15"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Tøm søk"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {rolesPresent.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip active={activeRole === "all"} onClick={() => setActiveRole("all")}>
              Alle
            </FilterChip>
            {rolesPresent.map((r) => (
              <FilterChip key={r} active={activeRole === r} onClick={() => setActiveRole(activeRole === r ? "all" : r)}>
                {roleConfig[r].label}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-12 text-center">
          <UserCircle className="mx-auto mb-3 h-10 w-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-700">
            {hasFilters ? "Ingen brukere matcher filtrene." : "Ingen brukere ennå"}
          </p>
          {hasFilters ? (
            <button
              type="button"
              onClick={() => {
                setSearch("")
                setActiveRole("all")
              }}
              className="mt-1 text-xs font-medium text-zinc-600 underline-offset-2 hover:underline"
            >
              Nullstill filtre
            </button>
          ) : (
            <p className="mt-1 text-xs text-zinc-400">Inviter en bruker for å komme i gang.</p>
          )}
        </div>
      ) : (
        <>
          {/* Desktop: pillekort-tabell */}
          <div className="hidden lg:block">
            <SoftTable>
              <SoftThead>
                <SoftTh>Bruker</SoftTh>
                <SoftTh>Rolle</SoftTh>
                <SoftTh>Tilgang</SoftTh>
                <SoftTh>Sist innlogget</SoftTh>
                <SoftTh />
              </SoftThead>
              <tbody>
                {filtered.map((row, idx) => {
                  const cfg = roleConfig[row.role] ?? roleConfig.store_employee
                  const Icon = cfg.icon
                  return (
                    <SoftTr key={row.id} index={idx}>
                      <SoftTd>
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl ${cfg.bg} flex items-center justify-center ring-1 ring-inset ring-black/5`}>
                            <span className={`font-display text-sm font-bold ${cfg.color}`}>{row.displayName.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{row.displayName}</p>
                            <p className="text-xs text-zinc-400">{row.email}</p>
                          </div>
                        </div>
                      </SoftTd>
                      <SoftTd>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </div>
                      </SoftTd>
                      <SoftTd>
                        <AccessCell row={row} allStores={allStores} editable={canAdminister} unitLabelPlural={unitLabelPlural} />
                      </SoftTd>
                      <SoftTd>
                        <span
                          className={cn("text-xs", row.lastSignIn === "Aldri" ? "text-zinc-400" : "text-zinc-600")}
                          title={row.lastSignInExact ?? undefined}
                        >
                          {row.lastSignIn}
                        </span>
                      </SoftTd>
                      <SoftTd>
                        {canAdminister && (
                          <div className="flex items-center justify-end gap-2">
                            <UserRoleSelect userId={row.id} currentRole={row.role} />
                            <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100">
                              <UserDeleteButton userId={row.id} userLabel={row.displayName} />
                            </span>
                          </div>
                        )}
                      </SoftTd>
                    </SoftTr>
                  )
                })}
              </tbody>
            </SoftTable>
          </div>

          {/* Mobil + nettbrett: kort */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((row) => {
              const cfg = roleConfig[row.role] ?? roleConfig.store_employee
              const Icon = cfg.icon
              return (
                <Card key={row.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 ring-1 ring-inset ring-black/5`}>
                        <span className={`text-sm font-bold ${cfg.color}`}>{row.displayName.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900 truncate">{row.displayName}</p>
                        <p className="text-xs text-zinc-400 truncate">{row.email}</p>
                      </div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Tilgang</p>
                        <AccessCell row={row} allStores={allStores} editable={canAdminister} unitLabelPlural={unitLabelPlural} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">Sist innlogget</p>
                        <span
                          className={cn("text-xs", row.lastSignIn === "Aldri" ? "text-zinc-400" : "text-zinc-600")}
                          title={row.lastSignInExact ?? undefined}
                        >
                          {row.lastSignIn}
                        </span>
                      </div>
                    </div>

                    {canAdminister && (
                      <div className="flex items-center gap-2 pt-1 border-t border-zinc-50">
                        <div className="flex-1 min-w-0">
                          <UserRoleSelect userId={row.id} currentRole={row.role} />
                        </div>
                        <UserDeleteButton userId={row.id} userLabel={row.displayName} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-transparent bg-zinc-900 text-white"
          : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50"
      )}
    >
      {children}
    </button>
  )
}
