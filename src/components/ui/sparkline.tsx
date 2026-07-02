/**
 * Mikrograf i brand-farge: glatt linje med areal-gradient og markert
 * siste punkt. Ren SVG uten avhengigheter — brukbar fra både server- og
 * klientkomponenter. Skaleres av containeren (viewBox + w-full).
 */
export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const W = 220
  const H = 56
  const P = 5
  if (values.length < 2) return null

  const max = Math.max(1, ...values)
  const stepX = (W - P * 2) / (values.length - 1)
  const pts = values.map((v, i) => ({
    x: P + i * stepX,
    y: H - P - (v / max) * (H - P * 2),
  }))

  // Midtpunkt-glatting: kvadratiske kurver gjennom hvert punkt
  let line = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const midX = (pts[i - 1].x + pts[i].x) / 2
    const midY = (pts[i - 1].y + pts[i].y) / 2
    line += ` Q ${pts[i - 1].x} ${pts[i - 1].y} ${midX} ${midY}`
  }
  const last = pts[pts.length - 1]
  line += ` L ${last.x} ${last.y}`
  const area = `${line} L ${last.x} ${H - P} L ${pts[0].x} ${H - P} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sparkline-fill)" />
      <path d={line} fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="3.5" fill="var(--brand-primary)" stroke="#fff" strokeWidth="1.5" />
    </svg>
  )
}
