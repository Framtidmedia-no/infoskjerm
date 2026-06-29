import type { LiveItem, OfferFields } from "@/lib/content/live"

/**
 * A structured retail offer rendered as a bold price card (SPAR/EUROSPAR style):
 * badge, product image, name, big price or discount, before-price, multi-buy and
 * the fine print. Sized in `vmin` so it scales cleanly on both portrait customer
 * screens and landscape previews. White card with red price + a chain-logo
 * footer (EUROSPAR logo for EUROSPAR stores, SPAR for SPAR, JOKER for JOKER).
 */

/** Branding for the store's chain, used for the footer logo and badge accent. */
export interface ChainBrand {
  name: string
  logoUrl: string | null
  color: string
  brandFg: string | null
}

const RED = "#e4002b"
const GREEN = "#16a34a"
const INK = "#0a0a0a"

function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const f = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
  if (from && to) return `Gjelder ${f(from)} – ${f(to)}`
  if (from) return `Gjelder fra ${f(from)}`
  return `Gjelder til ${f(to!)}`
}

function DiscountBubble({ rabatt }: { rabatt: string }) {
  return (
    <div style={{ flex: "0 0 auto", background: RED, color: "#fff", borderRadius: "50%", width: "30vmin", height: "30vmin", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 1vmin 4vmin rgba(0,0,0,.18)" }}>
      <span style={{ fontSize: "11vmin", fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.3vmin" }}>{rabatt}</span>
    </div>
  )
}

function PriceTag({ offer }: { offer: OfferFields }) {
  // Norwegian price split: kroner big, øre small raised.
  const [kr, ore] = (offer.pris ?? "").split(/[.,]/)
  return (
    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
      {offer.forpris && <span style={{ fontSize: "5vmin", color: "#9aa0a6", textDecoration: "line-through", fontWeight: 700, lineHeight: 1 }}>{offer.forpris}</span>}
      <div style={{ display: "flex", alignItems: "flex-start", color: RED, lineHeight: 0.85 }}>
        <span style={{ fontSize: "19vmin", fontWeight: 900, letterSpacing: "-0.6vmin" }}>{kr}</span>
        {ore && <span style={{ fontSize: "7.5vmin", fontWeight: 900, marginTop: "1.5vmin" }}>{ore}</span>}
      </div>
    </div>
  )
}

/**
 * Footer carrying the store's chain logo. Never shows a generic chain name to
 * customers: if there is no chain logo or name, the footer is omitted entirely.
 */
function BrandFooter({ chain }: { chain: ChainBrand | null }) {
  if (!chain || (!chain.logoUrl && !chain.name)) return null
  const accent = chain.color || GREEN
  return (
    <div style={{ flex: "0 0 auto", marginTop: "3vmin", marginLeft: "-5vmin", marginRight: "-5vmin", borderTop: `0.8vmin solid ${accent}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "2.5vmin 5vmin", minHeight: "9vmin", boxSizing: "border-box" }}>
      {chain.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={chain.logoUrl} alt={chain.name} style={{ maxHeight: "10vmin", maxWidth: "60%", objectFit: "contain" }} />
      ) : (
        <span style={{ color: accent, fontWeight: 900, letterSpacing: "0.5vmin", fontSize: "5vmin", textTransform: "uppercase" }}>
          {chain.name}
        </span>
      )}
    </div>
  )
}

export function OfferCard({ item, chain = null }: { item: LiveItem; chain?: ChainBrand | null }) {
  const offer = item.offer
  if (!offer) return null
  const period = formatPeriod(item.validFrom, item.validTo)
  const img = item.imageUrl
  const fine = [offer.enhetspris, offer.maks, offer.pant ? "+ pant" : null].filter(Boolean) as string[]
  const badgeBg = chain?.color ?? RED
  const badgeFg = chain?.brandFg ?? "#fff"

  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", color: INK, display: "flex", flexDirection: "column", padding: "4vmin 5vmin 0", boxSizing: "border-box", fontFamily: "Arial, Helvetica, sans-serif", overflow: "hidden" }}>
      {/* Badge + period */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: "3vmin", flexWrap: "wrap" }}>
        {offer.badge && (
          <span style={{ background: badgeBg, color: badgeFg, fontWeight: 900, fontSize: "5.5vmin", letterSpacing: "0.4vmin", padding: "1.6vmin 4vmin", borderRadius: "100vmin", textTransform: "uppercase" }}>{offer.badge}</span>
        )}
        {period && <span style={{ marginLeft: "auto", background: GREEN, color: "#fff", fontWeight: 800, fontSize: "3.4vmin", padding: "1.4vmin 3.2vmin", borderRadius: "100vmin" }}>{period}</span>}
      </div>

      {/* Product image — the hero; fills the card as large as possible */}
      {img && (
        <div style={{ flex: "1 1 auto", minHeight: "44vmin", margin: "1.5vmin 0", backgroundImage: `url('${img}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
      )}

      {/* Name + info */}
      <div style={{ flex: "0 0 auto" }}>
        <h1 style={{ fontSize: "8vmin", fontWeight: 900, margin: 0, lineHeight: 1.02, letterSpacing: "-0.3vmin" }}>{offer.varenavn}</h1>
        {offer.vareinfo && <p style={{ fontSize: "4vmin", color: "#5f6368", margin: "1.5vmin 0 0" }}>{offer.vareinfo}</p>}
      </div>

      {/* Price row */}
      <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "4vmin", marginTop: "3vmin" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5vmin" }}>
          {offer.mengde && <span style={{ fontSize: "7vmin", fontWeight: 900, color: INK, lineHeight: 1 }}>{offer.mengde}</span>}
          {fine.length > 0 && <span style={{ fontSize: "3.4vmin", color: "#5f6368", fontWeight: 600 }}>{fine.join("  ·  ")}</span>}
        </div>
        {offer.rabatt ? <DiscountBubble rabatt={offer.rabatt} /> : offer.pris ? <PriceTag offer={offer} /> : null}
      </div>

      <BrandFooter chain={chain} />
    </div>
  )
}
