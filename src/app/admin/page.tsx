import { redirect } from "next/navigation"
import { getAdminContext } from "@/lib/admin/admin-context"

/**
 * Admin-landingen. Skjermflåte — kommandosentralen — er hovedflaten, men vi ruter
 * rolle-bevisst så ingen havner i en redirect-loop (Skjermflåte er kun for
 * super_admin/chain/area/store_manager):
 *  - ikke innlogget → /login
 *  - super_admin uten valgt tenant → /admin/plattform (velg tenant først)
 *  - store_employee (redaktør) → /admin/kundeinnhold (deres hovedflate)
 *  - alle andre → /admin/skjermflate
 */
export default async function AdminHome() {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role === "super_admin" && !ctx.isImpersonating) redirect("/admin/plattform")
  if (ctx.role === "store_employee") redirect("/admin/kundeinnhold")
  redirect("/admin/skjermflate")
}
