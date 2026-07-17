import type { Metadata } from "next"
import Link from "next/link"
import { cache } from "react"
import { ContactForm } from "./contact-form"
import { getPublishedReferences, type PublicReference } from "@/lib/marketing/references"
import {
  getMarketingContent,
  formatNok,
  type MarketingBlock,
  type MarketingPrice,
} from "@/lib/marketing/content"

// Innholdet er CMS-styrt men endres sjelden — revalider hvert 5. minutt.
export const revalidate = 300

const getContent = cache(getMarketingContent)

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://infoskjerm.framtidtech.no"

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getContent()
  if (!seo) return {}
  return {
    metadataBase: new URL(BASE_URL),
    title: seo.title,
    description: seo.body,
    alternates: {
      canonical: "/",
      // Oppdagbar for AI-crawlere: peker mot den maskinlesbare oppsummeringen.
      types: { "text/plain": `${BASE_URL}/llms.txt` },
    },
    openGraph: { title: seo.title, description: seo.body, locale: "nb_NO", type: "website" },
  }
}

function TickerBand({ items }: { items: string }) {
  const parts = items
    .split("◆")
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const track = (
    <>
      {parts.map((part, i) => (
        <span key={i} className="mk-ticker__item">
          {part} <span className="mk-ticker__sep" aria-hidden>
            ✱
          </span>
        </span>
      ))}
    </>
  )
  return (
    <div className="mk-ticker" aria-label={`Innholdstyper: ${parts.join(", ")}`}>
      <div className="mk-ticker__track">
        {track}
        <span aria-hidden>{track}</span>
      </div>
    </div>
  )
}

function StagesSection({ stages }: { stages: MarketingBlock[] }) {
  if (stages.length === 0) return null
  return (
    <section id="slik-virker-det" className="mk-section mk-shell">
      <h2 className="mk-h2">
        <span className="mk-orn" aria-hidden>
          ◆
        </span>
        Slik virker det
      </h2>
      <ol className="mk-stages">
        {stages.map((stage) => (
          <li key={stage.id} className="mk-stage">
            <h3>{stage.title}</h3>
            <p>{stage.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function HardwareSection({ hardware }: { hardware: MarketingBlock | null }) {
  if (!hardware) return null
  return (
    <section className="mk-hardware">
      <div className="mk-shell mk-hardware__grid">
        <div>
          <h2 className="mk-h2">
            <span className="mk-orn" aria-hidden>
              ◆
            </span>
            {hardware.title}
          </h2>
          <p className="mk-hardware__body">{hardware.body}</p>
        </div>
        {hardware.extra.image_url ? (
          <figure className="mk-screenshot">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hardware.extra.image_url}
              alt={hardware.extra.image_alt || "Infoskjerm i drift — faktisk skjerminnhold"}
              loading="lazy"
              width={1920}
              height={1080}
            />
          </figure>
        ) : (
          <div className="mk-halftone" aria-hidden />
        )}
      </div>
    </section>
  )
}

function PricingSection({
  pricing,
  prices,
}: {
  pricing: MarketingBlock | null
  prices: MarketingPrice[]
}) {
  const activePrices = prices.filter((price) => price.active)
  if (activePrices.length === 0) return null
  return (
    <section id="priser" className="mk-section mk-shell">
      <h2 className="mk-h2">
        <span className="mk-orn" aria-hidden>
          ◆
        </span>
        {pricing?.title || "Priser"}
      </h2>
      {pricing?.body ? <p className="mk-section__lede">{pricing.body}</p> : null}
      <ul className="mk-prices">
        {activePrices.map((price) => (
          <li key={price.id} className="mk-price">
            <div>
              <div className="mk-price__product">{price.product}</div>
              <div className="mk-price__meta">
                {price.period} · {price.quantity_label}
              </div>
            </div>
            <div className="mk-price__amount">
              {formatNok(price.price_nok)}&nbsp;kr
              <span className="mk-price__unit">{price.unit}</span>
            </div>
          </li>
        ))}
      </ul>
      {pricing?.extra.footnote ? (
        <p className="mk-pricing__footnote">{pricing.extra.footnote}</p>
      ) : null}
    </section>
  )
}

function ReferenceSection({ references }: { references: PublicReference[] }) {
  if (references.length === 0) return null
  return (
    <section id="referanser" className="mk-section mk-shell">
      <h2 className="mk-h2">
        <span className="mk-orn" aria-hidden>
          ◆
        </span>
        Kunder som bruker Infoskjerm
      </h2>
      <div className="mk-refs">
        {references.map((ref) => (
          <article key={ref.id} className="mk-ref">
            {ref.screenshot_url ? (
              <figure className="mk-ref__shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ref.screenshot_url} alt={`Infoskjerm hos ${ref.company_name}`} loading="lazy" width={1400} height={788} />
              </figure>
            ) : null}
            {ref.quote ? <blockquote className="mk-ref__quote">«{ref.quote}»</blockquote> : null}
            <div className="mk-ref__by">
              {ref.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="mk-ref__logo" src={ref.logo_url} alt={ref.company_name} loading="lazy" />
              ) : (
                <span className="mk-ref__company">{ref.company_name}</span>
              )}
              {ref.contact_name || ref.contact_role ? (
                <span className="mk-ref__person">
                  {[ref.contact_name, ref.contact_role].filter(Boolean).join(", ")}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function FaqSection({ faqs }: { faqs: MarketingBlock[] }) {
  if (faqs.length === 0) return null
  return (
    <section id="sporsmal" className="mk-section mk-shell">
      <h2 className="mk-h2">
        <span className="mk-orn" aria-hidden>
          ◆
        </span>
        Spørsmål og svar
      </h2>
      <div className="mk-faq">
        {faqs.map((faq) => (
          <details key={faq.id} className="mk-faq__item">
            <summary>{faq.title}</summary>
            <p>{faq.body}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

function ContactSection({ cta }: { cta: MarketingBlock | null }) {
  if (!cta) return null
  return (
    <section id="kontakt" className="mk-cta">
      <div className="mk-shell mk-cta__inner">
        <h2 className="mk-h2">{cta.title}</h2>
        <p className="mk-cta__body">{cta.body}</p>
        <ContactForm />
      </div>
    </section>
  )
}

export default async function MarketingPage() {
  const content = await getContent()
  const references = await getPublishedReferences()
  const { hero } = content
  const heroLines = (hero?.title ?? "").split("\n").filter(Boolean)
  const year = new Date().getFullYear()

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "Framtid Tech AS",
        url: "https://framtidtech.no",
        email: "hei@framtidtech.no",
        telephone: "+47 940 03 452",
        vatID: "NO837596092MVA",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Luhrtoppen 2",
          postalCode: "1470",
          addressLocality: "Lørenskog",
          addressCountry: "NO",
        },
      },
      {
        "@type": "Service",
        name: "Infoskjerm",
        serviceType: "Digital signage / infoskjermer",
        provider: { "@type": "Organization", name: "Framtid Tech AS" },
        areaServed: "NO",
        offers: content.prices
          .filter((price) => price.active)
          .map((price) => ({
            "@type": "Offer",
            name: `${price.product} (${price.quantity_label})`,
            price: price.price_nok,
            priceCurrency: "NOK",
          })),
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a href="#hovedinnhold" className="mk-skip">
        Hopp til innholdet
      </a>
      <header className="mk-nav">
        <nav className="mk-shell mk-nav__row" aria-label="Hovednavigasjon">
          <Link href="/" className="mk-wordmark">
            <span className="mk-orn" aria-hidden>
              ◆{" "}
            </span>
            Infoskjerm
          </Link>
          <div className="mk-nav__links">
            <a href="#slik-virker-det" className="mk-nav__link mk-nav__link--optional">
              Slik virker det
            </a>
            <a href="#priser" className="mk-nav__link">
              Priser
            </a>
            <Link href="/login" className="mk-nav__link mk-nav__link--optional">
              Logg inn
            </Link>
            {hero?.extra.cta_url ? (
              <a href={hero.extra.cta_url} className="mk-btn mk-btn--accent">
                {hero.extra.cta_label || "Ta kontakt"}
              </a>
            ) : null}
          </div>
        </nav>
      </header>

      <main id="hovedinnhold">
        {hero ? (
          <section className="mk-hero mk-shell">
            {hero.extra.meta_line ? (
              <p className="mk-hero__meta mk-rise" style={{ "--i": 0 } as React.CSSProperties}>
                {hero.extra.meta_line}
              </p>
            ) : null}
            <h1 className="mk-display mk-rise" style={{ "--i": 1 } as React.CSSProperties}>
              {heroLines.map((line, i) => (
                <span key={i} className={i % 2 === 1 ? "mk-display__alt" : undefined}>
                  {line}
                </span>
              ))}
            </h1>
            <p className="mk-hero__lede mk-rise" style={{ "--i": 2 } as React.CSSProperties}>
              {hero.body}
            </p>
            <div className="mk-hero__actions mk-rise" style={{ "--i": 3 } as React.CSSProperties}>
              {hero.extra.cta_url ? (
                <a href={hero.extra.cta_url} className="mk-btn mk-btn--ink">
                  {hero.extra.cta_label || "Ta kontakt"}
                </a>
              ) : null}
              {hero.extra.secondary_url ? (
                <a href={hero.extra.secondary_url} className="mk-btn mk-btn--accent">
                  {hero.extra.secondary_label || "Se prisene"}
                </a>
              ) : null}
            </div>
            {content.facts.length > 0 ? (
              <dl className="mk-facts mk-rise" style={{ "--i": 4 } as React.CSSProperties}>
                {content.facts.map((fact) => (
                  <div key={fact.id}>
                    <dt>{fact.title}</dt>
                    <dd>{fact.body}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        ) : null}

        {hero?.extra.ticker_items ? <TickerBand items={hero.extra.ticker_items} /> : null}

        <StagesSection stages={content.stages} />

        <div className="mk-divider" aria-hidden>
          <span>✱</span>
          <span>✱</span>
          <span>✱</span>
          <span>✱</span>
        </div>

        <HardwareSection hardware={content.hardware} />

        <PricingSection pricing={content.pricing} prices={content.prices} />

        <ReferenceSection references={references} />

        <FaqSection faqs={content.faqs} />

        <ContactSection cta={content.cta} />
      </main>

      <footer className="mk-footer mk-shell">
        {content.footer?.title ? <p className="mk-footer__line">{content.footer.title}</p> : null}
        <div className="mk-footer__meta">
          <span>
            Utviklet av <a href="https://framtidtech.no">Framtid Tech AS</a>
          </span>
          <span>Org.nr 837&nbsp;596&nbsp;092</span>
          <Link href="/personvern">Personvern</Link>
          <Link href="/vilkar">Vilkår</Link>
          <Link href="/login">Logg inn</Link>
          <span>© {year} Framtid Tech AS</span>
        </div>
      </footer>
    </>
  )
}
