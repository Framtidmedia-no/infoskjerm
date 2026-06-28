import { Utensils } from 'lucide-react'
interface MenuItem { name: string; price?: number }
interface Props { fields: Record<string, unknown> }
export function LunchMenuModule({ fields }: Props) {
  const dateLabel = (fields.date_label as string) || 'I dag'
  let items: MenuItem[] = []
  try { items = JSON.parse(fields.items as string) as MenuItem[] } catch {}
  const imageUrl = (fields.image_url as string) || null
  return (
    <div className="flex items-center gap-12 h-full px-20 text-white">
      <div className="flex-1">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
            <Utensils className="w-7 h-7 text-orange-400" />
          </div>
          <span className="text-orange-400 font-semibold text-lg uppercase tracking-widest">Lunsj — {dateLabel}</span>
        </div>
        {items.length === 0 ? (
          <p className="text-2xl text-zinc-500 italic">Ingen retter lagt inn ennå.</p>
        ) : (
          <div className="space-y-4">
            {items.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-2xl px-6 py-4 border border-white/10">
                <span className="text-xl font-semibold">{item.name}</span>
                {item.price && <span className="text-lg font-bold text-orange-300">{item.price} kr</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      {imageUrl && <img src={imageUrl} alt="Lunsj" className="w-56 h-56 rounded-3xl object-cover border border-white/10 flex-shrink-0" />}
    </div>
  )
}
