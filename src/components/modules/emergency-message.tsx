interface Props { fields: Record<string, unknown> }

const severityAccent: Record<string, string> = {
  info: 'var(--brand-primary, #16a34a)',
  warning: '#f59e0b',
  critical: '#ef4444',
}

export function EmergencyMessageModule({ fields }: Props) {
  const title = (fields.title as string) || 'Viktig beskjed'
  const message = (fields.message as string) || 'Ingen melding.'
  const severity = (fields.severity as string) || 'warning'
  const accentColor = severityAccent[severity] ?? severityAccent.warning

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: accentColor }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <p
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: accentColor }}
          >
            {severity === 'critical' ? 'Kritisk varsel' : severity === 'warning' ? 'Advarsel' : 'Informasjon'}
          </p>
        </div>

        <div>
          <h2 className="text-7xl font-black leading-[1.05] text-white max-w-4xl mb-8">
            {title}
          </h2>
          <p className="text-2xl text-white/70 leading-relaxed max-w-3xl">
            {message}
          </p>
        </div>

        <div>
          <div
            className="h-px w-24 mb-6"
            style={{ backgroundColor: accentColor }}
          />
          <p className="text-base text-white/40 font-medium uppercase tracking-[0.2em]">
            Aktiv melding
          </p>
        </div>
      </div>
    </div>
  )
}
