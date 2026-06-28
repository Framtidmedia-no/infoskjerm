import { ImageIcon } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function InstagramWallModule({ fields }: Props) {
  const username = fields.username as string | null
  const hashtag = fields.hashtag as string | null

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-pink-900 text-white p-8 gap-4">
      <div className="text-5xl">📸</div>
      <p className="text-xl font-semibold">
        {username ? `@${username}` : hashtag ? `#${hashtag}` : "Instagram"}
      </p>
      <p className="text-pink-300 text-sm text-center">
        Instagram-integrasjon ikke konfigurert.<br/>
        Koble til Instagram Basic Display API for å vise bilder.
      </p>
    </div>
  )
}
