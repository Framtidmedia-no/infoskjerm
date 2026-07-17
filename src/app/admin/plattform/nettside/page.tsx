import { getMarketingContent } from "@/lib/marketing/content"
import { listReferences } from "@/lib/marketing/references"
import { NettsideClient } from "./nettside-client"
import { ReferencesClient } from "./references-client"

export const dynamic = "force-dynamic"

/**
 * Redigering av den offentlige produktsiden (/): tekstblokker, ticker og
 * priser. Gates av plattform-layouten (kun super_admin).
 */
export default async function NettsidePage() {
  const content = await getMarketingContent()
  const references = await listReferences()
  const blocks = [
    ...(content.hero ? [content.hero] : []),
    ...content.facts,
    ...content.stages,
    ...(content.hardware ? [content.hardware] : []),
    ...(content.pricing ? [content.pricing] : []),
    ...(content.cta ? [content.cta] : []),
    ...(content.footer ? [content.footer] : []),
    ...(content.seo ? [content.seo] : []),
    ...content.faqs,
    ...content.pages,
  ]

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Nettside</h1>
          <p className="text-sm text-zinc-500">
            Innholdet på den offentlige produktsiden. Endringer er synlige på forsiden innen fem
            minutter.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          Åpne forsiden ↗
        </a>
      </div>
      <div className="space-y-8">
        <NettsideClient blocks={blocks} prices={content.prices} />
        <ReferencesClient references={references} />
      </div>
    </div>
  )
}
