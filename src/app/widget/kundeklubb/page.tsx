import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/server"
import { getBaseUrl } from "@/lib/base-url"
import { KundeklubbCard } from "@/app/widget/_shared/kundeklubb-card"

/**
 * Full-screen customer-club invite for a store screen: store-branded, with a QR
 * code pointing to that store's /klubb/<store> sign-up landing page. Sized in
 * vmin so it fills portrait customer screens. Provision per store with
 * scripts/xibo/build-widget-layout.mjs.
 *
 * Usage: /widget/kundeklubb?store=<storeId>
 */

export const dynamic = "force-dynamic"

interface ChainRow { name: string; color: string; logo_url: string | null }

export default async function KundeklubbWidget({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams
  const supabase = createAdminClient()
  const { data } = store
    ? await supabase.from("stores").select("id, name, chains(name, color, logo_url)").eq("id", store).maybeSingle()
    : { data: null }

  const chain = (data?.chains as unknown as ChainRow | null)
  const accent = chain?.color || "#16a34a"
  const logo = chain?.logo_url ?? null
  const base = await getBaseUrl()
  const url = `${base}/klubb/${store ?? ""}`
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 700, color: { dark: "#0a0a0a", light: "#ffffff" } })

  return (
    <main style={{ margin: 0, width: "100%", height: "100vh", position: "relative", overflow: "hidden" }}>
      <KundeklubbCard headline="Bli medlem – det er gratis" subtext="Medlemspriser, bonus og ukens beste tilbud." qrUrl={qr} accent={accent} logoUrl={logo} chainName={chain?.name ?? null} />
    </main>
  )
}
