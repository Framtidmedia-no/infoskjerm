interface Props { fields: Record<string, unknown> }

export function ProductOfferModule({ fields }: Props) {
  const name = (fields.product_name as string) || 'Produkt'
  const origPrice = fields.original_price as number | undefined
  const offerPrice = (fields.offer_price as number) || 0
  const imageUrl = (fields.image_url as string) || null
  const validUntil = (fields.valid_until as string) || null

  return (
    <div
      className="flex h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0f0a0a 0%, #1a0c0c 100%)' }}
    >
      {/* Left: content */}
      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <div className="inline-flex items-center gap-2 bg-red-500 text-white text-sm font-black uppercase tracking-widest px-4 py-2 rounded-full mb-10">
            TILBUD
          </div>
          <h1 className="text-6xl font-black leading-tight text-white max-w-xl mb-8">
            {name}
          </h1>
        </div>

        <div>
          <p className="text-[8rem] font-black leading-none text-red-400 tabular-nums">
            {offerPrice} kr
          </p>
          {origPrice && (
            <p className="text-2xl text-white/30 line-through mt-2">
              {origPrice} kr
            </p>
          )}
          {validUntil && (
            <p className="text-base text-white/40 font-medium mt-4">Gjelder til {validUntil}</p>
          )}
        </div>
      </div>

      {/* Right: image */}
      {imageUrl && (
        <div className="w-96 h-full flex-shrink-0 relative">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover"
            style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 25%)' }}
          />
        </div>
      )}
    </div>
  )
}
