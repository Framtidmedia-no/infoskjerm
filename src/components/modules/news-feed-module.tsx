interface Props { fields: Record<string, unknown> }

export function NewsFeedModule({ fields }: Props) {
  const feedUrl = fields.feed_url as string | null
  const title = (fields.title as string) || "Nyheter"

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
          {title}
        </p>

        <div className="flex flex-col gap-8">
          <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
            RSS-integrasjon ikke konfigurert
          </h2>
          <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
            Legg til et RSS-endepunkt for å hente og vise nyheter direkte på skjermen.
          </p>
        </div>

        <p className="text-base text-white/40 font-medium">
          {feedUrl ? feedUrl : "Ingen kilde konfigurert"}
        </p>
      </div>
    </div>
  )
}
