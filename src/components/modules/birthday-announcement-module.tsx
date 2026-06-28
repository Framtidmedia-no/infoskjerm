interface Props { fields: Record<string, unknown> }

export function BirthdayAnnouncementModule({ fields }: Props) {
  const name = (fields.name as string) || 'Ola Nordmann'
  const message = (fields.message as string) || 'Gratulerer med dagen!'
  const age = fields.age ? Number(fields.age) : null
  const imageUrl = (fields.image_url as string) || null

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <span
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--brand-primary, #16a34a)' }}
          >
            Gratulerer med dagen
          </span>
        </div>

        <div className="flex items-center gap-16">
          {imageUrl && (
            <div
              className="flex-shrink-0 w-48 h-48 rounded-full overflow-hidden"
              style={{ outline: '3px solid var(--brand-primary, #16a34a)', outlineOffset: '4px' }}
            >
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {!imageUrl && (
            <div
              className="flex-shrink-0 w-48 h-48 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--brand-primary, #16a34a) 0%, #15803d 100%)',
                outline: '3px solid var(--brand-primary, #16a34a)',
                outlineOffset: '4px',
              }}
            >
              <span className="text-white text-6xl font-black">
                {name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div>
            {age !== null && (
              <div className="mb-4">
                <span className="text-8xl font-black leading-none" style={{ color: 'var(--brand-primary, #16a34a)' }}>
                  {age}
                </span>
                <span className="text-4xl font-bold text-white/40 ml-3">år</span>
              </div>
            )}
            <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
              {name}
            </h2>
          </div>
        </div>

        <div>
          <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
            {message}
          </p>
          <p className="text-base text-white/40 font-medium mt-6">
            Fra hele teamet
          </p>
        </div>
      </div>
    </div>
  )
}
