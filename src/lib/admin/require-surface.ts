import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/admin/admin-context"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { enabledSurfaces } from "@/lib/tenant/features"

/**
 * Server-guard for flate-spesifikke admin-ruter (Kundeskjerm/Internt): har den
 * effektive tenanten skrudd av flaten (features.hideKundeflate/hideInternflate),
 * sendes brukeren til den andre flatens innholdsliste i stedet for en tom/skjult
 * seksjon. Speiler admin-layoutens oppslag av effektiv tenant (act-as).
 */
export async function requireSurface(surface: "kunde" | "intern"): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const ctx = await getAdminContext()
  const { data: profile } = await supabase
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single()

  const config = await getTenantConfig(supabase, ctx?.effectiveTenantId || profile?.tenant_id || null)
  if (!enabledSurfaces(config.features)[surface]) {
    redirect(surface === "kunde" ? "/admin/innhold" : "/admin/kundeinnhold")
  }
}
