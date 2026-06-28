import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

type UserRole = "super_admin" | "chain_manager" | "store_manager" | "store_employee"

export async function requireRole(allowedRoles: UserRole[]): Promise<{ userId: string; role: UserRole; tenantId: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("role, tenant_id")
    .eq("id", user.id)
    .single()

  const role = (profile?.role ?? "store_employee") as UserRole

  if (!allowedRoles.includes(role)) {
    redirect("/admin")
  }

  return { userId: user.id, role, tenantId: profile?.tenant_id ?? "" }
}
