import { Building2 } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function CompanyInfoModule({ fields }: Props) {
  const title = (fields.title as string) || 'Informasjon'
  const content = (fields.content as string) || ''
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-indigo-400" />
        </div>
        <span className="text-indigo-400 font-semibold text-lg uppercase tracking-widest">Butikken</span>
      </div>
      <h2 className="text-5xl font-black leading-tight mb-8">{title}</h2>
      <p className="text-2xl text-zinc-300 leading-relaxed max-w-3xl">{content}</p>
    </div>
  )
}
