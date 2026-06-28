interface Props { fields: Record<string, unknown> }

export function ProductSpotlightModule({ fields }: Props) {
  const productName = (fields.product_name as string) || 'Produktnavn'
  const description = (fields.description as string) || ''
  const price = (fields.price as string) || ''
  const originalPrice = (fields.original_price as string) || ''
  const imageUrl = (fields.image_url as string) || null
  const badge = (fields.badge as string) || ''

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
          {badge || 'Produktspot'}
        </p>

        <div className="flex items-center gap-16">
          <div className="flex flex-col gap-8 flex-1">
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
              {productName}
            </h2>

            {description && (
              <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
                {description}
              </p>
            )}

            {(price || originalPrice) && (
              <div className="flex items-baseline gap-6">
                {price && (
                  <span className="text-5xl font-black text-white">{price}</span>
                )}
                {originalPrice && (
                  <span className="text-2xl text-white/30 line-through font-medium">{originalPrice}</span>
                )}
              </div>
            )}
          </div>

          {imageUrl && (
            <div className="w-80 h-80 rounded-2xl overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <style>{`
                @keyframes ken-burns {
                  0%   { transform: scale(1) translate(0, 0); }
                  25%  { transform: scale(1.08) translate(-1%, -1%); }
                  75%  { transform: scale(1.12) translate(1%, 0%); }
                  100% { transform: scale(1) translate(0, 0); }
                }
                .ken-burns-img { animation: ken-burns 12s ease-in-out infinite; }
              `}</style>
              <img
                src={imageUrl}
                alt={productName}
                className="w-full h-full object-cover ken-burns-img"
              />
            </div>
          )}
        </div>

        <p className="text-base text-white/40 font-medium">
          {productName}
          {price ? ` · ${price}` : ''}
        </p>
      </div>
    </div>
  )
}
