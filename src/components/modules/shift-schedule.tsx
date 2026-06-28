interface Shift { name: string; time: string; role?: string }
interface Props { fields: Record<string, unknown> }

export function ShiftScheduleModule({ fields }: Props) {
  const weekLabel = (fields.week_label as string) || 'Denne uken'
  const department = (fields.department as string) || ''

  let shifts: Shift[] = []
  try {
    const raw = fields.shifts
    shifts = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Shift[]
  } catch {
    shifts = []
  }

  return (
    <div
      className="flex flex-col h-full text-white"
      style={{ background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)' }}
    >
      <div className="h-2 w-full" style={{ backgroundColor: 'var(--brand-primary, #16a34a)' }} />

      <div className="flex flex-col justify-between flex-1 px-16 py-12">
        <div>
          <p
            className="text-sm font-bold uppercase tracking-[0.25em]"
            style={{ color: 'var(--brand-primary, #16a34a)' }}
          >
            Vaktplan{department ? ` — ${department}` : ''}
          </p>
        </div>

        <div className="flex-1 flex flex-col justify-center py-8">
          {shifts.length === 0 ? (
            <p className="text-2xl text-white/40 italic">Ingen vakter lagt inn ennå.</p>
          ) : (
            <div className="space-y-0">
              {shifts.slice(0, 7).map((shift, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-5 border-b border-white/10"
                >
                  <div className="flex items-baseline gap-8 flex-1">
                    <span className="text-2xl font-black text-white w-56 flex-shrink-0">
                      {shift.name}
                    </span>
                    {shift.role && (
                      <span className="text-base text-white/40 font-medium uppercase tracking-[0.15em]">
                        {shift.role}
                      </span>
                    )}
                  </div>
                  <span
                    className="text-xl font-bold tabular-nums flex-shrink-0"
                    style={{ color: 'var(--brand-primary, #16a34a)' }}
                  >
                    {shift.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-base text-white/40 font-medium">
          {weekLabel}
          {shifts.length > 0 && ` · ${shifts.length} vakter`}
        </p>
      </div>
    </div>
  )
}
