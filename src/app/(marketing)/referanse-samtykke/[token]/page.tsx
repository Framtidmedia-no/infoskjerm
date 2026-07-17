import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { carnivalFont, monoFont } from "@/lib/fonts"
import { getReferenceByToken } from "@/lib/marketing/references"
import { CONSENT_INTRO, CONSENT_POINTS, CONSENT_FOOTER } from "@/lib/marketing/consent-text"
import { ConsentForm } from "./consent-client"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Referanse-samtykke | Infoskjerm — Framtid Tech",
  robots: { index: false, follow: false },
}

export default async function ConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ref = await getReferenceByToken(token)
  if (!ref) notFound()

  return (
    <div className={`${carnivalFont.variable} ${monoFont.variable} mk`}>
      <main id="hovedinnhold" className="mk-shell mk-prose-wrap">
        <h1 className="mk-h2 mk-prose-title">
          <span className="mk-orn" aria-hidden>
            ◆
          </span>
          Referanse-samtykke
        </h1>
        <div className="mk-prose">
          <p>{CONSENT_INTRO}</p>

          <h2>Slik vil referansen vises</h2>
          <div className="mk-ref-preview">
            <p className="mk-ref-preview__company">{ref.company_name}</p>
            {ref.quote ? <blockquote className="mk-ref-preview__quote">«{ref.quote}»</blockquote> : null}
            {ref.contact_name || ref.contact_role ? (
              <p className="mk-ref-preview__by">
                {[ref.contact_name, ref.contact_role].filter(Boolean).join(", ")}
              </p>
            ) : null}
            {ref.screenshot_url ? (
              <figure className="mk-screenshot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ref.screenshot_url} alt={`Skjermbilde fra ${ref.company_name}`} width={1400} height={788} />
              </figure>
            ) : null}
          </div>

          <h2>Hva du samtykker til</h2>
          <ul>
            {CONSENT_POINTS.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
          <p>{CONSENT_FOOTER}</p>
        </div>

        {ref.already_signed ? (
          <div className="mk-form__sent" role="status">
            <p className="mk-form__sent-title">Samtykket er allerede registrert.</p>
            <p>Takk! Dere kan trekke samtykket når som helst ved å kontakte hei@framtidtech.no.</p>
          </div>
        ) : (
          <ConsentForm token={token} />
        )}
      </main>
    </div>
  )
}
