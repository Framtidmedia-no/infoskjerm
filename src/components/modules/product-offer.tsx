import { Tag } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function ProductOfferModule({ fields }: Props) {
  const name = (fields.product_name as string) || 'Produkt'
  const origPrice = fields.original_price as number | undefined
  const offerPrice = (fields.offer_price as number) || 0
  const imageUrl = (fields.image_url as string) || null
  const validUntil = (fields.valid_until as string) || null
  return (
    <div className="flex items-center gap-16 h-full px-20 text-white">
      {imageUrl && (
        <img src={imageUrl} alt={name} className="w-72 h-72 rounded-3xl object-cover border border-white/10" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
            <Tag className="w-6 h-6 text-red-400" />
          </div>
          <span className="text-red-400 font-semibold text-lg uppercase tracking-widest">Tilbud</span>
        </div>
        <h2 className="text-5xl font-black mb-8">{name}</h2>
        <div className="flex items-baseline gap-6 mb-4">
          <span className="text-8xl font-black text-red-400">{offerPrice} kr</span>
          {origPrice && <span className="text-3xl text-zinc-500 line-through">{origPrice} kr</span>}
        </div>
        {validUntil && <p className="text-zinc-400 text-lg mt-4">Gjelder til {validUntil}</p>}
      </div>
    </div>
  )
}
