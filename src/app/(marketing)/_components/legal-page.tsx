import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getMarketingPageBySlug } from "@/lib/marketing/content"

/**
 * Delt lesevisning for CMS-drevne undersider (/personvern, /vilkar).
 * Body er markdown-lite: «## » = mellomtittel, «- » = punktliste,
 * blank linje = nytt avsnitt.
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://infoskjerm.framtidtech.no"

export async function legalMetadata(slug: string): Promise<Metadata> {
  const page = await getMarketingPageBySlug(slug)
  if (!page) return {}
  return {
    metadataBase: new URL(BASE_URL),
    title: `${page.title} | Infoskjerm — Framtid Tech`,
    alternates: { canonical: `/${slug}` },
    robots: { index: true },
  }
}

function renderBody(body: string): React.ReactNode[] {
  const blocks = body.split(/\n\s*\n/)
  const out: React.ReactNode[] = []
  blocks.forEach((block, i) => {
    const lines = block.split("\n").filter((line) => line.trim() !== "")
    let paragraph: string[] = []
    let bullets: string[] = []
    const flushParagraph = () => {
      if (paragraph.length > 0) {
        out.push(<p key={`${i}-p-${out.length}`}>{paragraph.join(" ")}</p>)
        paragraph = []
      }
    }
    const flushBullets = () => {
      if (bullets.length > 0) {
        out.push(
          <ul key={`${i}-ul-${out.length}`}>
            {bullets.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        )
        bullets = []
      }
    }
    for (const line of lines) {
      if (line.startsWith("## ")) {
        flushParagraph()
        flushBullets()
        out.push(<h2 key={`${i}-h-${out.length}`}>{line.slice(3)}</h2>)
      } else if (line.startsWith("- ")) {
        flushParagraph()
        bullets.push(line.slice(2))
      } else {
        flushBullets()
        paragraph.push(line)
      }
    }
    flushParagraph()
    flushBullets()
  })
  return out
}

export async function LegalPage({ slug }: { slug: string }) {
  const page = await getMarketingPageBySlug(slug)
  if (!page) notFound()
  const year = new Date().getFullYear()

  return (
    <>
      <header className="mk-nav">
        <nav className="mk-shell mk-nav__row" aria-label="Hovednavigasjon">
          <Link href="/" className="mk-wordmark">
            <span className="mk-orn" aria-hidden>
              ◆{" "}
            </span>
            Infoskjerm
          </Link>
          <div className="mk-nav__links">
            <Link href="/#priser" className="mk-nav__link">
              Priser
            </Link>
            <Link href="/#kontakt" className="mk-btn mk-btn--accent">
              Ta kontakt
            </Link>
          </div>
        </nav>
      </header>
      <main id="hovedinnhold" className="mk-shell mk-prose-wrap">
        <h1 className="mk-h2 mk-prose-title">
          <span className="mk-orn" aria-hidden>
            ◆
          </span>
          {page.title}
        </h1>
        <div className="mk-prose">{renderBody(page.body)}</div>
      </main>
      <footer className="mk-footer mk-shell">
        <div className="mk-footer__meta">
          <span>
            Utviklet av <a href="https://framtidtech.no">Framtid Tech AS</a>
          </span>
          <span>Org.nr 837 596 092</span>
          <Link href="/personvern">Personvern</Link>
          <Link href="/vilkar">Vilkår</Link>
          <span>© {year} Framtid Tech AS</span>
        </div>
      </footer>
    </>
  )
}
