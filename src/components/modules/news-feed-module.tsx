import { Rss } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function NewsFeedModule({ fields }: Props) {
  const feedUrl = fields.feed_url as string | null
  const title = fields.title as string | null

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8 gap-4">
      <div className="text-4xl">📰</div>
      <p className="text-xl font-semibold">{title ?? "Nyhetsstrøm"}</p>
      {feedUrl ? (
        <p className="text-gray-400 text-xs font-mono text-center break-all max-w-md">{feedUrl}</p>
      ) : null}
      <p className="text-gray-500 text-sm text-center">
        RSS-integrasjon ikke konfigurert.<br/>
        Legg til et /api/feed-endepunkt for å hente ekte nyheter.
      </p>
    </div>
  )
}
