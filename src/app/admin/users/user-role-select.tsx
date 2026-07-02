"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateUserRole } from "./actions"
import { type UserRole, ROLE_LABELS } from "@/lib/roles"

// Redaktør (store_employee) er utfaset — ikke lenger tildelbar.
const roleOptions: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: ROLE_LABELS.super_admin },
  { value: "chain_manager", label: ROLE_LABELS.chain_manager },
  { value: "area_manager", label: ROLE_LABELS.area_manager },
  { value: "store_manager", label: ROLE_LABELS.store_manager },
]

export function UserRoleSelect({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const router = useRouter()
  const [role, setRole] = useState<UserRole>(currentRole)
  const [saving, setSaving] = useState(false)

  async function handleChange(newRole: UserRole) {
    const previous = role
    setSaving(true)
    setRole(newRole)
    const res = await updateUserRole(userId, newRole)
    setSaving(false)
    if (!res.ok) {
      // Rull tilbake så selecten viser det databasen faktisk har.
      setRole(previous)
      toast.error(`Kunne ikke endre rolle: ${res.error ?? "ukjent feil"}`)
      return
    }
    toast.success(`Rolle endret til ${ROLE_LABELS[newRole]}`)
    router.refresh()
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value as UserRole)}
      disabled={saving}
      aria-label="Endre rolle"
      className="text-xs border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-300 disabled:opacity-50"
    >
      {roleOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
