import { UserRound } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function EmployeeSpotlightModule({ fields }: Props) {
  const name = (fields.name as string) || 'Ansatt'
  const title = (fields.title as string) || ''
  const message = (fields.message as string) || ''
  const imageUrl = (fields.image_url as string) || null
  return (
    <div className="flex items-center gap-16 h-full px-20 text-white">
      <div className="flex-shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-64 h-64 rounded-3xl object-cover border-4 border-white/10" />
        ) : (
          <div className="w-64 h-64 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center">
            <UserRound className="w-24 h-24 text-zinc-500" />
          </div>
        )}
      </div>
      <div>
        <p className="text-amber-400 font-semibold text-lg uppercase tracking-widest mb-4">Ansatt i fokus</p>
        <h2 className="text-6xl font-black mb-3">{name}</h2>
        {title && <p className="text-2xl text-zinc-400 mb-6">{title}</p>}
        {message && <p className="text-xl text-zinc-300 leading-relaxed max-w-xl">{message}</p>}
      </div>
    </div>
  )
}
