import { Newspaper } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function InternalNewsModule({ fields }: Props) {
  const title = (fields.title as string) || 'Intern nyhet'
  const body = (fields.body as string) || 'Ingen innhold ennå.'
  const color = (fields.highlight_color as string) || '#7c3aed'
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: color + '33', border: `1px solid ${color}66` }}>
          <Newspaper className="w-7 h-7" style={{ color }} />
        </div>
        <span className="font-semibold text-lg uppercase tracking-widest" style={{ color }}>Internt</span>
      </div>
      <h2 className="text-6xl font-black leading-tight mb-8">{title}</h2>
      <p className="text-2xl text-zinc-300 leading-relaxed max-w-3xl">{body}</p>
    </div>
  )
}
