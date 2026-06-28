interface Props { fields: Record<string, unknown> }

export function SeasonalItemsModule({ fields }: Props) {
  const title = (fields.title as string) || 'Sesongvarer'
  const season = (fields.season as string) || 'Sommer'
  const description = (fields.description as string) || ''
  const imageUrl = (fields.image_url as string) || null

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
          {season}
        </p>

        <div className="flex items-center gap-16">
          <div className="flex flex-col gap-8 flex-1">
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
              {title}
            </h2>
            {description && (
              <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
                {description}
              </p>
            )}
          </div>

          {imageUrl && (
            <div className="w-72 h-72 rounded-2xl overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        <p className="text-base text-white/40 font-medium">
          {season} · {title}
        </p>
      </div>
    </div>
  )
}
