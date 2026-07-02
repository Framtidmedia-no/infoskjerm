import { requireRole } from "@/lib/admin/require-role"
import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { fetchScreensByStore } from "@/lib/xibo/screens"
import { KundeklubbSettings } from "../_components/kundeklubb-settings"
import { KioskSettings } from "./kiosk-settings"
import { StoreInfoCard } from "./store-info-card"
import { OpeningHoursCard } from "./opening-hours-card"
import type { OpeningHours } from "@/lib/power/schedule"
import { StoreScreens, type DisplayLite, type ScreenRowLite } from "../../skjermer/store-screens"
import { getTenantConfig } from "@/lib/tenant/config-server"
import { hasFeature } from "@/lib/tenant/features"
import { getBaseUrl } from "@/lib/base-url"

export const dynamic = "force-dynamic"

// GLN-plassholderen som brukes for enheter uten reelt EPD-lokasjonsnummer.
const GLN_PLACEHOLDER = "0000000000000"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StoreDetailPage({ params }: PageProps) {
  const { id } = await params
  const { supabase, tenantId } = await requireRole(["super_admin", "chain_manager", "area_manager"])

  const { data: store } = await supabase
    .from("stores")
    .select("*, chains(name, color)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .maybeSingle()

  if (!store) notFound()

  const chain = (store.chains as unknown as { name: string; color: string } | null)
  // GLN / EPD-lokasjonsnummer er dagligvare-spesifikt — feltet vises kun for
  // tenants med «gln»-funksjonen (plassholderen vises som tomt felt).
  const tenantConfig = await getTenantConfig(supabase, (store as { tenant_id: string | null }).tenant_id)
  // Fysiske Xibo-skjermer, lest live fra motoren — sann status.
  const screensByStore = await fetchScreensByStore([{ id: store.id, name: store.name }])
  const displays: DisplayLite[] = (screensByStore.get(store.id) ?? []).map((s) => ({
    displayId: s.displayId,
    name: s.name,
    online: s.online,
    lastSeen: s.lastSeen,
    role: s.role,
    currentLayout: s.currentLayout,
  }))

  // Våre screens-rader (enhets-styring: token + flate/avdeling/orientering + xibo-binding).
  const { data: assignRows } = await supabase
    .from("screens")
    .select("id, token, flate, avdeling, orientation, xibo_display_id, power_mode, power_on_lead_min, power_off_lag_min, power_override, power_override_until, power_state, power_state_at")
    .eq("store_id", store.id)
    .order("name")
  const assignRowsLite = (assignRows ?? []) as unknown as ScreenRowLite[]
  const origin = await getBaseUrl()

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title={store.name}
        subtitle={chain?.name ?? ""}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/stores">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Tilbake
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-4 sm:p-6 space-y-6">
        {/* Store info — redigerbar, med danger zone for sletting */}
        <StoreInfoCard
          store={{
            id: store.id,
            name: store.name,
            company_name: store.company_name ?? "",
            org_number: store.org_number ?? "",
            gln: store.gln === GLN_PLACEHOLDER ? "" : (store.gln ?? ""),
            email: store.email ?? "",
            city: store.city ?? "",
          }}
          showGln={hasFeature(tenantConfig.features, "gln")}
          screenCount={displays.length}
          unitLabel={tenantConfig.unitLabel}
        />
        {store.latitude && store.longitude && (
          <p className="-mt-4 px-1 text-[11px] text-zinc-400">
            Koordinater: <span className="font-mono">{String(store.latitude)}°N, {String(store.longitude)}°Ø</span>
          </p>
        )}

        {/* Åpningstider — driver automatisk TV-av/på + kiosk-hvilevisning */}
        <OpeningHoursCard
          storeId={store.id}
          initial={((store as unknown as { apningstider: OpeningHours | null }).apningstider) ?? null}
        />

        {/* Skjerm-styring: hver tilkoblet Xibo-skjerm + kiosk-skjermer, inline tildeling */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-zinc-500" />
              <h2 className="font-semibold text-zinc-900">Skjermer</h2>
            </div>
            <StoreScreens storeId={store.id} displays={displays} rows={assignRowsLite} origin={origin} apningstider={((store as unknown as { apningstider: OpeningHours | null }).apningstider) ?? null} />
          </CardContent>
        </Card>

        {/* Kiosk-passord (privat visning) */}
        <Card>
          <CardContent className="p-0">
            <KioskSettings
              storeId={store.id}
              storeName={store.name}
              hasPassword={!!(store as unknown as { kiosk_password_hash: string | null }).kiosk_password_hash}
            />
          </CardContent>
        </Card>

        {/* Kundeklubb (per-store QR + toggle) */}
        <Card>
          <CardContent className="p-5">
            <KundeklubbSettings
              storeId={store.id}
              initial={{
                enabled: store.kundeklubb_enabled ?? false,
                url: store.kundeklubb_url ?? "",
                headline: store.kundeklubb_headline ?? "Bli medlem – det er gratis",
                subtext: store.kundeklubb_subtext ?? "Medlemspriser, bonus og ukens beste tilbud.",
                cta: store.kundeklubb_cta ?? "📱 Skann for å melde deg inn",
              }}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
