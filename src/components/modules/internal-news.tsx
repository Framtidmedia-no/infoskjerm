interface Props { fields: Record<string, unknown> }

export function InternalNewsModule({ fields }: Props) {
  const title = (fields.title as string) || 'Intern nyhet'
  const body = (fields.body as string) || ''
  const author = (fields.author as string) || ''

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      {/* Brand accent bar */}
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <p
            className="text-sm font-bold uppercase tracking-[0.25em] mb-8"
            style={{ color: 'var(--brand-primary, #16a34a)' }}
          >
            Intern nyhet
          </p>
          <h1 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
            {title}
          </h1>
        </div>

        {body && (
          <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
            {body}
          </p>
        )}

        {author && (
          <p className="text-base text-white/40 font-medium">{author}</p>
        )}
      </div>
    </div>
  )
}
