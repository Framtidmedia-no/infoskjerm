interface Props { fields: Record<string, unknown> }

export function InstagramWallModule({ fields }: Props) {
  const username = fields.username as string | null
  const hashtag = fields.hashtag as string | null
  const handle = username ? `@${username}` : hashtag ? `#${hashtag}` : "Instagram"

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
          Instagram
        </p>

        <div className="flex flex-col gap-8">
          <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl">
            {handle}
          </h2>
          <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
            Koble til Instagram Basic Display API for å vise bilder direkte på skjermen.
          </p>
        </div>

        <p className="text-base text-white/40 font-medium">
          Instagram-integrasjon ikke konfigurert
        </p>
      </div>
    </div>
  )
}
