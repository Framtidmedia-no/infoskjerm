interface Props { fields: Record<string, unknown> }

export function QueueStatusModule({ fields }: Props) {
  const title = (fields.title as string) || 'Kø-status'
  const currentNumber = Number(fields.current_number) || 42
  const serving = Number(fields.serving) || 38
  const waitMinutes = Number(fields.wait_minutes) || null

  return (
    <div className="flex flex-col h-full text-white" style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}>
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <p className="text-sm font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--brand-primary, #16a34a)' }}>
          {title}
        </p>

        <div className="flex gap-20 items-center">
          <div className="flex flex-col gap-4">
            <p className="text-base text-white/40 font-medium uppercase tracking-[0.25em]">Betjener nå</p>
            <span className="text-7xl font-black leading-[1.05] text-white tabular-nums" style={{ color: 'var(--brand-primary, #16a34a)' }}>
              {serving}
            </span>
          </div>

          <div
            className="w-px self-stretch"
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          />

          <div className="flex flex-col gap-4">
            <p className="text-base text-white/40 font-medium uppercase tracking-[0.25em]">Ditt nummer</p>
            <span className="text-7xl font-black leading-[1.05] text-white tabular-nums">
              {currentNumber}
            </span>
            {waitMinutes !== null && waitMinutes > 0 && (
              <p className="text-2xl text-white/70 leading-relaxed">
                ca. {waitMinutes} min ventetid
              </p>
            )}
          </div>
        </div>

        <p className="text-base text-white/40 font-medium">
          {currentNumber - serving} {currentNumber - serving === 1 ? 'person' : 'personer'} foran deg
        </p>
      </div>
    </div>
  )
}
