import { createAdminClient } from "@/lib/supabase/server"
import { activeSeason, type Season } from "@/lib/season"
import { hasFeature, parseTenantFeatures } from "./features"

/**
 * Sesong for en butikks skjerm: aktiv sesong HVIS butikkens tenant har
 * `seasonThemes` slått på. Widget-sidene er offentlige og leser via
 * service-role (etablert widget-mønster). Uten butikk (base-feed) → null.
 * Feiler alltid stille til null — en skjerm skal aldri knekke på pynt.
 */
export async function seasonForStore(storeId: string | null): Promise<Season | null> {
  if (!storeId) return null
  try {
    const admin = createAdminClient()
    const { data } = await admin.from("stores").select("tenants(features)").eq("id", storeId).maybeSingle()
    // `features` (030) er ikke i den genererte Database-typen ennå → cast (samme som config-server.ts).
    const row = data as unknown as { tenants: { features: unknown } | null } | null
    const features = parseTenantFeatures(row?.tenants?.features)
    return hasFeature(features, "seasonThemes") ? activeSeason() : null
  } catch {
    return null
  }
}
