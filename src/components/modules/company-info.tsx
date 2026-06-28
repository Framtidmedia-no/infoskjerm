interface Props { fields: Record<string, unknown> }

export function CompanyInfoModule({ fields }: Props) {
  const title = (fields.title as string) || 'Informasjon'
  const content = (fields.content as string) || ''
  const label = (fields.label as string) || 'Butikken'
  const meta = (fields.meta as string) || ''

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
          {label}
        </p>

        <div className="flex flex-col gap-8">
          <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
            {title}
          </h2>
          {content && (
            <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
              {content}
            </p>
          )}
        </div>

        <p className="text-base text-white/40 font-medium">
          {meta || title}
        </p>
      </div>
    </div>
  )
}
