interface Props { fields: Record<string, unknown> }

export function EmployeeSpotlightModule({ fields }: Props) {
  const name = (fields.name as string) || 'Ansatt'
  const title = (fields.title as string) || ''
  const message = (fields.message as string) || ''
  const imageUrl = (fields.image_url as string) || null

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-1 overflow-hidden">
        {/* Text content */}
        <div className="flex flex-col justify-between flex-1 px-16 py-12">
          <div>
            <p
              className="text-sm font-bold uppercase tracking-[0.25em]"
              style={{ color: 'var(--brand-primary, #16a34a)' }}
            >
              Ansatt i fokus
            </p>
          </div>

          <div>
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-6">
              {name}
            </h2>
            {title && (
              <p
                className="text-2xl font-semibold mb-6"
                style={{ color: 'var(--brand-primary, #16a34a)' }}
              >
                {title}
              </p>
            )}
            {message && (
              <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
                {message}
              </p>
            )}
          </div>

          <p className="text-base text-white/40 font-medium">
            Månedens ansatt
          </p>
        </div>

        {/* Image */}
        {imageUrl && (
          <div className="relative w-[420px] flex-shrink-0 overflow-hidden">
            <img
              src={imageUrl}
              alt={name}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Gradient mask blending into dark background */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, #0f0f0f 0%, transparent 30%, transparent 80%, #1a1a1a 100%)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}
