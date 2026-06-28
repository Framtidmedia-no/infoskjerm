interface Props { fields: Record<string, unknown> }

export function GoogleReviewsModule({ fields }: Props) {
  const businessName = (fields.business_name as string) || "Google Anmeldelser"
  const reviewText = (fields.review_text as string) || ""
  const reviewerName = (fields.reviewer_name as string) || ""
  const rating = Number(fields.rating) || 5

  const stars = Array.from({ length: 5 }, (_, i) => i < rating)

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
          {businessName}
        </p>

        <div className="flex flex-col gap-8">
          <div className="flex gap-3">
            {stars.map((filled, i) => (
              <svg
                key={i}
                className="w-12 h-12"
                viewBox="0 0 24 24"
                fill={filled ? 'var(--brand-primary, #16a34a)' : 'none'}
                stroke={filled ? 'var(--brand-primary, #16a34a)' : 'rgba(255,255,255,0.2)'}
                strokeWidth="1.5"
              >
                <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            ))}
          </div>

          {reviewText ? (
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
              &ldquo;{reviewText}&rdquo;
            </h2>
          ) : (
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
              Google Reviews-integrasjon ikke konfigurert
            </h2>
          )}

          {!reviewText && (
            <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
              Koble til Google Business API for å vise ekte anmeldelser.
            </p>
          )}
        </div>

        <p className="text-base text-white/40 font-medium">
          {reviewerName || "Ingen anmelder konfigurert"}
        </p>
      </div>
    </div>
  )
}
