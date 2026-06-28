import { GraduationCap } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
const catColors: Record<string, string> = { HMS: '#10b981', Kundeservice: '#8b5cf6', Produktkunnskap: '#f59e0b', Rutiner: '#3b82f6' }
export function TrainingMaterialModule({ fields }: Props) {
  const title = (fields.title as string) || 'Opplæring'
  const body = (fields.body as string) || ''
  const category = (fields.category as string) || 'Rutiner'
  const color = catColors[category] || '#6366f1'
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: color + '33', border: `1px solid ${color}66` }}>
          <GraduationCap className="w-7 h-7" style={{ color }} />
        </div>
        <span className="font-semibold text-lg uppercase tracking-widest" style={{ color }}>{category}</span>
      </div>
      <h2 className="text-5xl font-black leading-tight mb-8">{title}</h2>
      <p className="text-xl text-zinc-300 leading-relaxed max-w-3xl">{body}</p>
    </div>
  )
}
