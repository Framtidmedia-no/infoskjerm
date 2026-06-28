import { Images } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function SlideModule({ fields }: Props) {
  const title = (fields.title as string) || null
  const images = fields.images as string | undefined
  const imageList: string[] = (() => { try { return JSON.parse(images ?? '[]') as string[] } catch { return [] } })()
  const firstImage = imageList[0] || null
  return (
    <div className="relative h-full w-full overflow-hidden">
      {firstImage ? (
        <img src={firstImage} alt={title || 'Slide'} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-zinc-500">
          <Images className="w-16 h-16 mb-4" />
          <p className="text-xl">Ingen bilder lagt til ennå</p>
        </div>
      )}
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-12">
          <h2 className="text-4xl font-black text-white">{title}</h2>
        </div>
      )}
    </div>
  )
}
