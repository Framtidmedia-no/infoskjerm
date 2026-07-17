import { getMarketingContent, formatNok } from "@/lib/marketing/content"

export const revalidate = 300

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://infoskjerm.framtidtech.no"

/**
 * llms.txt — maskinlesbar oppsummering for AI-søk/assistenter, generert fra
 * CMS-innholdet så den alltid er i synk med siden.
 */
export async function GET(): Promise<Response> {
  const content = await getMarketingContent()
  const lines: string[] = []

  lines.push("# Infoskjerm — Framtid Tech AS")
  if (content.seo?.body) lines.push("", `> ${content.seo.body}`)
  if (content.hero?.body) lines.push("", content.hero.body)

  if (content.stages.length > 0) {
    lines.push("", "## Slik virker det")
    content.stages.forEach((stage, i) => {
      lines.push(`${i + 1}. **${stage.title}** — ${stage.body}`)
    })
  }

  if (content.hardware) {
    lines.push("", `## ${content.hardware.title}`, content.hardware.body)
  }

  const prices = content.prices.filter((price) => price.active)
  if (prices.length > 0) {
    lines.push("", "## Priser")
    for (const price of prices) {
      lines.push(
        `- ${price.product} (${price.period.toLowerCase()}, ${price.quantity_label}): ${formatNok(price.price_nok)} kr ${price.unit}`
      )
    }
    if (content.pricing?.extra.footnote) lines.push(content.pricing.extra.footnote)
  }

  if (content.faqs.length > 0) {
    lines.push("", "## Spørsmål og svar")
    for (const faq of content.faqs) {
      lines.push(`- **${faq.title}** ${faq.body}`)
    }
  }

  lines.push(
    "",
    "## Kontakt og lenker",
    "- Leverandør: Framtid Tech AS (org.nr 837 596 092), Luhrtoppen 2, 1470 Lørenskog — hei@framtidtech.no, +47 940 03 452",
    `- Produktside: ${BASE_URL}/`,
    `- Personvern: ${BASE_URL}/personvern`,
    `- Vilkår: ${BASE_URL}/vilkar`,
    "- Selskap: https://framtidtech.no"
  )

  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
