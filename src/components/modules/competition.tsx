import { Trophy } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function CompetitionModule({ fields }: Props) {
  const title = (fields.title as string) || 'Konkurranse'
  const description = (fields.description as string) || ''
  const prize = (fields.prize as string) || ''
  const deadline = (fields.deadline as string) || ''
  const imageUrl = (fields.image_url as string) || null
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-amber-400" />
        </div>
        <span className="text-amber-400 font-semibold text-lg uppercase tracking-widest">Konkurranse</span>
        {deadline && <span className="ml-auto text-zinc-500 text-sm">Frist: {deadline}</span>}
      </div>
      <div className="flex gap-12">
        <div className="flex-1">
          <h2 className="text-5xl font-black leading-tight mb-6">{title}</h2>
          <p className="text-xl text-zinc-300 leading-relaxed mb-8">{description}</p>
          {prize && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-6 py-4">
              <p className="text-zinc-400 text-sm uppercase tracking-wide mb-1">Premie</p>
              <p className="text-2xl font-bold text-amber-300">{prize}</p>
            </div>
          )}
        </div>
        {imageUrl && <img src={imageUrl} alt={title} className="w-64 h-64 rounded-3xl object-cover border border-white/10 flex-shrink-0" />}
      </div>
    </div>
  )
}
