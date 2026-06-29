/**
 * Full-screen customer-club invite card (portrait). Store-branded, with a QR to
 * the store's /klubb/<store> sign-up page. Shared by the standalone
 * /widget/kundeklubb screen and the CMS-managed customer rotation, so a store
 * can edit the text and target screens like any other content.
 */
export function KundeklubbCard({
  headline,
  subtext,
  qrUrl,
  accent,
  logoUrl,
  chainName,
}: {
  headline: string
  subtext: string
  qrUrl: string
  accent: string
  logoUrl: string | null
  chainName: string | null
}) {
  return (
    <div style={{ margin: 0, width: "100%", height: "100%", position: "absolute", inset: 0, overflow: "hidden", color: "#fff", fontFamily: "Arial, Helvetica, sans-serif", background: `linear-gradient(160deg, ${accent}, #0a0a0a)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8vmin", boxSizing: "border-box", textAlign: "center" }}>
      <div style={{ position: "absolute", top: "-14vmin", right: "-10vmin", width: "44vmin", height: "44vmin", borderRadius: "50%", background: "rgba(255,255,255,.08)" }} />
      <div style={{ position: "absolute", bottom: "-18vmin", left: "-12vmin", width: "54vmin", height: "54vmin", borderRadius: "50%", background: "rgba(0,0,0,.15)" }} />

      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={chainName ?? ""} style={{ position: "relative", height: "9vmin", maxWidth: "60%", objectFit: "contain", filter: "brightness(0) invert(1)", marginBottom: "4vmin" }} />
      ) : (
        <p style={{ position: "relative", letterSpacing: "0.5vmin", fontSize: "4vmin", fontWeight: 800, textTransform: "uppercase", opacity: 0.85, margin: "0 0 4vmin" }}>{chainName ?? "Gange-Rolv"}</p>
      )}

      <p style={{ position: "relative", margin: 0, fontSize: "4.5vmin", fontWeight: 800, letterSpacing: "0.4vmin", textTransform: "uppercase", opacity: 0.9 }}>Kundeklubb</p>
      <h1 style={{ position: "relative", margin: "2vmin 0 0", fontSize: "11vmin", fontWeight: 900, lineHeight: 1.02 }}>{headline}</h1>
      {subtext && <p style={{ position: "relative", margin: "3vmin 0 0", fontSize: "4.6vmin", maxWidth: "82%", opacity: 0.85 }}>{subtext}</p>}

      <div style={{ position: "relative", marginTop: "6vmin", background: "#fff", padding: "4vmin", borderRadius: "4vmin", boxShadow: "0 3vmin 8vmin rgba(0,0,0,.3)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR-kode for å melde deg inn" style={{ display: "block", width: "46vmin", height: "46vmin" }} />
      </div>
      <p style={{ position: "relative", marginTop: "4vmin", fontSize: "5vmin", fontWeight: 900 }}>📱 Skann for å melde deg inn</p>
    </div>
  )
}
