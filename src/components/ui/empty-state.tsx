/**
 * Tomtilstand med karakter: håndtegnet strek-illustrasjon i brand-tone,
 * tittel + hjelpetekst og valgfri handling. Varianter: «kikkert» (ingen
 * treff i søk/filter) og «spire» (ingenting her ennå — kom i gang).
 */

function KikkertIllustrasjon() {
  return (
    <svg viewBox="0 0 120 90" className="h-24 w-32" fill="none" aria-hidden>
      <ellipse cx="60" cy="80" rx="34" ry="4" fill="currentColor" opacity="0.08" />
      <circle cx="44" cy="42" r="17" stroke="currentColor" strokeWidth="2.5" className="text-zinc-700" />
      <circle cx="44" cy="42" r="10.5" stroke="var(--brand-primary)" strokeWidth="2" opacity="0.55" />
      <line x1="57" y1="55" x2="72" y2="70" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" className="text-zinc-700" />
      <path d="M37 38c2-3.5 6-5.5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-300" />
      <path d="M84 26l3.5 3.5M87.5 26L84 29.5" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <circle cx="94" cy="46" r="2" fill="var(--brand-primary)" opacity="0.45" />
      <circle cx="20" cy="24" r="1.6" fill="currentColor" className="text-zinc-300" />
      <path d="M14 52c3 0 3-2.5 6-2.5s3 2.5 6 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-zinc-300" />
    </svg>
  )
}

function SpireIllustrasjon() {
  return (
    <svg viewBox="0 0 120 90" className="h-24 w-32" fill="none" aria-hidden>
      <ellipse cx="60" cy="82" rx="30" ry="4" fill="currentColor" opacity="0.08" />
      <path d="M46 80c0-8 2-13 14-13s14 5 14 13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-zinc-700" />
      <path d="M46 80h28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-zinc-700" />
      <path d="M60 67V46" stroke="var(--brand-primary)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M60 52c0-8-6-12-13-12 0 8 5 12 13 12z" stroke="var(--brand-primary)" strokeWidth="2.2" strokeLinejoin="round" fill="var(--brand-light)" />
      <path d="M60 46c0-8 6-12 13-12 0 8-5 12-13 12z" stroke="var(--brand-primary)" strokeWidth="2.2" strokeLinejoin="round" fill="var(--brand-light)" />
      <path d="M88 30l2.5 2.5M90.5 30L88 32.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className="text-zinc-300" />
      <circle cx="28" cy="34" r="1.8" fill="currentColor" className="text-zinc-300" />
      <circle cx="92" cy="56" r="1.5" fill="var(--brand-primary)" opacity="0.4" />
    </svg>
  )
}

export function EmptyState({
  variant = "spire",
  title,
  hint,
  action,
}: {
  variant?: "kikkert" | "spire"
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="fx-rise flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
      {variant === "kikkert" ? <KikkertIllustrasjon /> : <SpireIllustrasjon />}
      <p className="font-display mt-3 text-sm font-bold text-zinc-900">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-500">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
