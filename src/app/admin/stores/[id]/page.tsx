import { requireRole } from "@/lib/admin/require-role"
import { notFound } from "next/navigation"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Mail, Monitor, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { fetchScreensByStore } from "@/lib/xibo/screens"
import { KundeklubbSettings } from "../_components/kundeklubb-settings"
import { KioskSettings } from "./kiosk-settings"
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
  // GLN / EPD-lokasjonsnummer er dagligvare-spesifikt — vis kun for tenants som
  // har «gln»-funksjonen, og aldri plassholderverdien.
  const tenantConfig = await getTenantConfig(supabase, (store as { tenant_id: string | null }).tenant_id)
  const showGln = hasFeature(tenantConfig.features, "gln")
    && !!store.gln && store.gln !== GLN_PLACEHOLDER
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
    .select("id, token, flate, avdeling, orientation, xibo_display_id")
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
        {/* Store info */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-zinc-900">Butikkinformasjon</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Selskapsnavn</p>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                  <p className="text-sm text-zinc-700">{store.company_name}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">E-post</p>
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <p className="text-sm text-zinc-700">{store.email}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Org.nr</p>
                <p className="text-sm font-mono text-zinc-700">{store.org_number}</p>
              </div>
              {showGln && (
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">GLN</p>
                  <p className="text-sm font-mono text-zinc-700">{store.gln}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">By</p>
                <p className="text-sm text-zinc-700">{store.city}</p>
              </div>
              {store.latitude && store.longitude && (
                <div>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">Koordinater</p>
                  <p className="text-sm font-mono text-zinc-700">{String(store.latitude)}°N, {String(store.longitude)}°Ø</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Skjerm-styring: hver tilkoblet Xibo-skjerm + kiosk-skjermer, inline tildeling */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-zinc-500" />
              <h2 className="font-semibold text-zinc-900">Skjermer</h2>
            </div>
            <StoreScreens storeId={store.id} displays={displays} rows={assignRowsLite} origin={origin} />
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
