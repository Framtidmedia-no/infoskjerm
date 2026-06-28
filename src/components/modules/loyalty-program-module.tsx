interface Props { fields: Record<string, unknown> }

export function LoyaltyProgramModule({ fields }: Props) {
  const title = (fields.title as string) || 'Fordelsclub'
  const description = (fields.description as string) || 'Bli med i vår fordelsclub og spar på hvert kjøp!'
  const pointsLabel = (fields.points_label as string) || 'Bonus-poeng'
  const pointsValue = (fields.points_value as string) || '+10 poeng per 100 kr'
  const cta = (fields.cta as string) || 'Registrer deg i dag'
  const imageUrl = (fields.image_url as string) || null
  const milestone = (fields.milestone as string) || null

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <span
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--brand-primary, #16a34a)' }}
          >
            Lojalitetsprogram
          </span>
        </div>

        <div className="flex items-center gap-16">
          <div className="flex-1 min-w-0">
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-8">
              {title}
            </h2>

            <p className="text-2xl text-white/70 leading-relaxed max-w-3xl mb-10">
              {description}
            </p>

            <div
              className="inline-flex items-baseline gap-3 rounded-2xl px-8 py-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span
                className="text-sm font-bold uppercase tracking-[0.25em]"
                style={{ color: 'var(--brand-primary, #16a34a)' }}
              >
                {pointsLabel}
              </span>
              <span className="text-2xl font-bold text-white">{pointsValue}</span>
            </div>
          </div>

          {imageUrl && (
            <div className="flex-shrink-0">
              <img
                src={imageUrl}
                alt={title}
                className="w-64 h-64 object-cover rounded-3xl"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div
            className="rounded-xl px-8 py-4"
            style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }}
          >
            <p className="text-white font-bold text-xl">{cta}</p>
          </div>
          {milestone && (
            <p className="text-base text-white/40 font-medium">{milestone}</p>
          )}
          {!milestone && (
            <p className="text-base text-white/40 font-medium">Neste milestep</p>
          )}
        </div>
      </div>
    </div>
  )
}
