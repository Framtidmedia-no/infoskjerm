"use client"

import { useState } from "react"
import { updateUserRole } from "./actions"

type UserRole = "super_admin" | "chain_manager" | "store_manager" | "store_employee"

const roleOptions: { value: UserRole; label: string }[] = [
  { value: "super_admin", label: "Super Admin" },
  { value: "chain_manager", label: "Kjedeleder" },
  { value: "store_manager", label: "Butikksjef" },
  { value: "store_employee", label: "Ansatt" },
]

export function UserRoleSelect({ userId, currentRole }: { userId: string; currentRole: UserRole }) {
  const [role, setRole] = useState<UserRole>(currentRole)
  const [saving, setSaving] = useState(false)

  async function handleChange(newRole: UserRole) {
    setSaving(true)
    setRole(newRole)
    await updateUserRole(userId, newRole)
    setSaving(false)
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value as UserRole)}
      disabled={saving}
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
