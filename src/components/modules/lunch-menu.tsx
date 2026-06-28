interface MenuItem { name: string; price?: number }
interface Props { fields: Record<string, unknown> }

export function LunchMenuModule({ fields }: Props) {
  const dateLabel = (fields.date_label as string) || 'I dag'
  const headline = (fields.headline as string) || ''
  const imageUrl = (fields.image_url as string) || null

  let items: MenuItem[] = []
  try {
    const raw = fields.items
    items = (typeof raw === 'string' ? JSON.parse(raw) : raw) as MenuItem[]
  } catch {
    items = []
  }

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-1 overflow-hidden">
        {/* Menu content */}
        <div className="flex flex-col justify-between flex-1 px-16 py-12">
          <div>
            <p
              className="text-sm font-bold uppercase tracking-[0.25em]"
              style={{ color: 'var(--brand-primary, #16a34a)' }}
            >
              Lunsj — {dateLabel}
            </p>
          </div>

          <div>
            {headline && (
              <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-10">
                {headline}
              </h2>
            )}

            {items.length === 0 ? (
              <p className="text-2xl text-white/40 italic">Ingen retter lagt inn ennå.</p>
            ) : (
              <ul className="space-y-5">
                {items.slice(0, 5).map((item, i) => (
                  <li
                    key={i}
                    className="flex items-baseline justify-between border-b border-white/10 pb-5"
                  >
                    <span className="text-2xl text-white/70 leading-relaxed">
                      {item.name}
                    </span>
                    {item.price !== undefined && item.price > 0 && (
                      <span
                        className="text-xl font-bold ml-8 flex-shrink-0"
                        style={{ color: 'var(--brand-primary, #16a34a)' }}
                      >
                        {item.price} kr
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-base text-white/40 font-medium">
            {items.length > 0 ? `${items.length} retter` : 'Meny'}
          </p>
        </div>

        {/* Food image */}
        {imageUrl && (
          <div className="relative w-[360px] flex-shrink-0 overflow-hidden">
            <img
              src={imageUrl}
              alt="Lunsj"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
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
