interface Props { fields: Record<string, unknown> }

export function CompetitionModule({ fields }: Props) {
  const title = (fields.title as string) || 'Konkurranse'
  const description = (fields.description as string) || ''
  const prize = (fields.prize as string) || ''
  const deadline = (fields.deadline as string) || ''
  const imageUrl = (fields.image_url as string) || null

  return (
    <div className="flex h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1c1208 100%)' }}>
      {/* Left: content */}
      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-2 h-12 rounded-full bg-amber-400" />
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-amber-400">
              Konkurranse
            </p>
          </div>
          <h1 className="text-6xl font-black leading-[1.05] text-white max-w-2xl mb-6">
            {title}
          </h1>
          {description && (
            <p className="text-xl text-white/65 leading-relaxed max-w-xl">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-end gap-12">
          {prize && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400/70 mb-2">Premie</p>
              <p className="text-4xl font-black text-amber-300">{prize}</p>
            </div>
          )}
          {deadline && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/40 mb-2">Frist</p>
              <p className="text-2xl font-bold text-white/70">{deadline}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: image */}
      {imageUrl && (
        <div className="w-96 h-full flex-shrink-0">
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover opacity-80"
            style={{ maskImage: 'linear-gradient(to right, transparent, black 30%)' }}
          />
        </div>
      )}
    </div>
  )
}
