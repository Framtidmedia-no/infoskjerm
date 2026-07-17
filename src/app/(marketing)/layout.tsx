import { Analytics } from "@vercel/analytics/react"
import { carnivalFont, monoFont } from "@/lib/fonts"

/**
 * Ramme for den offentlige produktsiden. Kun font-variabler + mk-scope —
 * alt visuelt er klasse-scopet under .mk i globals.css og rører ikke
 * admin-, auth- eller widget-flatene. Analytics er cookieless (Vercel Web
 * Analytics) og lastes kun på marketing-flaten.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${carnivalFont.variable} ${monoFont.variable} mk`}>
      {children}
      <Analytics />
    </div>
  )
}
