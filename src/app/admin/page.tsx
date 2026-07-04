import { redirect } from "next/navigation"
import { getAdminContext } from "@/lib/admin/admin-context"

/**
 * Admin-landingen. Rolle-bevisst ruting (ingen redirect-loop):
 *  - ikke innlogget → /login
 *  - super_admin uten valgt tenant → /admin/plattform (velg tenant først)
 *  - store_employee (redaktør) → /admin/kundeinnhold
 *  - alle andre → /admin/cms
 *
 * NB: Skjermflåte (/admin/skjermflate) er MIDLERTIDIG ikke landing — den laster
 * mange live-iframes (coverflow + inspektør) som krasjer iOS Safari/PWA (OOM).
 * Re-aktiveres som landing når mobil-varianten er lettvekts.
 */
export default async function AdminHome() {
  const ctx = await getAdminContext()
  if (!ctx) redirect("/login")
  if (ctx.role === "super_admin" && !ctx.isImpersonating) redirect("/admin/plattform")
  if (ctx.role === "store_employee") redirect("/admin/kundeinnhold")
  redirect("/admin/cms")
}
