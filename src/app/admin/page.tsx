import { redirect } from "next/navigation"
import { getAdminContext } from "@/lib/admin/admin-context"

/**
 * Admin-landingen. Skjermflåte — kommandosentralen — er hovedflaten. Rolle-bevisst
 * ruting (ingen redirect-loop):
 *  - ikke innlogget → /login
 *  - super_admin uten valgt tenant → /admin/plattform (velg tenant først)
 *  - store_employee (redaktør) → /admin/kundeinnhold
 *  - alle andre → /admin/skjermflate
 *
 * Skjermflåte er mobil-trygg: coverflow-en (3D/blur/iframes) rendres kun på desktop;
 * mobil får en lettvekts statisk variant.
 */
export default async function AdminHome() {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role === "super_admin" && !ctx.isImpersonating) redirect("/admin/plattform")
  if (ctx.role === "store_employee") redirect("/admin/kundeinnhold")
  redirect("/admin/skjermflate")
}
