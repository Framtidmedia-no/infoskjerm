import { BarChart3 } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function SalesStatsModule({ fields }: Props) {
  const title = (fields.title as string) || 'Salgstall'
  const period = (fields.period as string) || 'Dag'
  const target = (fields.target as number) || 0
  const actual = (fields.actual as number) || 0
  const pct = target > 0 ? Math.round((actual / target) * 100) : 100
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-10">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
          <BarChart3 className="w-7 h-7 text-emerald-400" />
        </div>
        <span className="text-emerald-400 font-semibold text-lg uppercase tracking-widest">Salgstall — {period}</span>
      </div>
      <h2 className="text-4xl font-black mb-10">{title}</h2>
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
          <p className="text-zinc-400 text-sm uppercase tracking-wide mb-2">Faktisk</p>
          <p className="text-6xl font-black text-emerald-400">{actual.toLocaleString('nb-NO')}</p>
          <p className="text-zinc-500 text-sm mt-1">kr</p>
        </div>
        {target > 0 && (
          <div className="bg-white/5 rounded-3xl p-8 border border-white/10">
            <p className="text-zinc-400 text-sm uppercase tracking-wide mb-2">Mål</p>
            <p className="text-6xl font-black text-zinc-300">{target.toLocaleString('nb-NO')}</p>
            <p className="text-zinc-500 text-sm mt-1">kr</p>
          </div>
        )}
      </div>
      {target > 0 && (
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Budsjettoppnåelse</span>
            <span className={`font-bold ${pct >= 100 ? 'text-emerald-400' : pct >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>
          </div>
          <div className="h-4 bg-white/10 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
