import { Calendar } from 'lucide-react'
interface Shift { name: string; time: string; role?: string }
interface Props { fields: Record<string, unknown> }
export function ShiftScheduleModule({ fields }: Props) {
  const weekLabel = (fields.week_label as string) || 'Denne uken'
  let shifts: Shift[] = []
  try { shifts = JSON.parse(fields.shifts as string) as Shift[] } catch {}
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
          <Calendar className="w-7 h-7 text-blue-400" />
        </div>
        <span className="text-blue-400 font-semibold text-lg uppercase tracking-widest">Vaktplan — {weekLabel}</span>
      </div>
      {shifts.length === 0 ? (
        <p className="text-2xl text-zinc-500 italic">Ingen vakter lagt inn ennå.</p>
      ) : (
        <div className="space-y-3">
          {shifts.slice(0, 6).map((s, i) => (
            <div key={i} className="flex items-center gap-6 bg-white/5 rounded-2xl px-6 py-4 border border-white/10">
              <span className="text-xl font-bold text-white w-48">{s.name}</span>
              <span className="text-lg text-blue-300 font-mono">{s.time}</span>
              {s.role && <span className="text-sm text-zinc-400 ml-auto">{s.role}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
