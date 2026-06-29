import QRCode from "qrcode"
import { createAdminClient } from "@/lib/supabase/server"
import { getBaseUrl } from "@/lib/base-url"

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
    <main style={{ margin: 0, width: "100%", height: "100vh", overflow: "hidden", position: "relative", color: "#fff", fontFamily: "Arial, Helvetica, sans-serif", background: `linear-gradient(160deg, ${accent}, #0a0a0a)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8vmin", boxSizing: "border-box", textAlign: "center" }}>
      <div style={{ position: "absolute", top: "-14vmin", right: "-10vmin", width: "44vmin", height: "44vmin", borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
      <div style={{ position: "absolute", bottom: "-18vmin", left: "-12vmin", width: "54vmin", height: "54vmin", borderRadius: "50%", background: "rgba(0,0,0,.15)" }} />

      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt={chain?.name ?? ""} style={{ position: "relative", height: "9vmin", maxWidth: "60%", objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: "4vmin" }} />
      ) : (
        <p style={{ position: "relative", letterSpacing: "0.5vmin", fontSize: "4vmin", fontWeight: 800, textTransform: "uppercase", opacity: 0.85, margin: "0 0 4vmin" }}>{chain?.name ?? "Gange-Rolv"}</p>
      )}

      <p style={{ position: "relative", margin: 0, fontSize: "4.5vmin", fontWeight: 800, letterSpacing: "0.4vmin", textTransform: "uppercase", opacity: 0.9 }}>Kundeklubb</p>
      <h1 style={{ position: "relative", margin: "2vmin 0 0", fontSize: "11vmin", fontWeight: 900, lineHeight: 1.02 }}>Bli medlem<br />– det er gratis</h1>
      <p style={{ position: "relative", margin: "3vmin 0 0", fontSize: "4.6vmin", maxWidth: "80%", opacity: 0.85 }}>Medlemspriser, bonus og ukens beste tilbud.</p>

      <div style={{ position: "relative", marginTop: "6vmin", background: "#fff", padding: "4vmin", borderRadius: "4vmin", boxShadow: "0 3vmin 8vmin rgba(0,0,0,.3)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR-kode for å melde deg inn" style={{ display: "block", width: "46vmin", height: "46vmin" }} />
      </div>
      <p style={{ position: "relative", marginTop: "4vmin", fontSize: "5vmin", fontWeight: 900 }}>📱 Skann for å melde deg inn</p>
    </main>
  )
}
