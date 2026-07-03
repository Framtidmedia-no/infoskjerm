/**
 * Viser en sanert HTML-side kant til kant i en LÅST sandbox-iframe.
 *
 * `sandbox` uten allow-scripts/allow-same-origin = ingen JavaScript-kjøring,
 * ingen tilgang til vår origin, ingen navigasjon — kun tegning. CSS-animasjon
 * kjører fint. Fila serveres via /widget/html-content/<id> med Content-Type
 * text/html (Storage serverer den som text/plain, så den kan ikke iframes
 * direkte) + streng CSP. Tredje sikkerhetslag over sanering + CSP.
 *
 * Velger stående/liggende variant etter skjermens orientering; faller tilbake
 * til den andre når bare én er lastet opp (samme mønster som fullskjerm-media).
 */
export function HtmlSlide({
  id,
  landscapeUrl,
  portraitUrl,
  portrait,
}: {
  id: string
  landscapeUrl: string | null
  portraitUrl: string | null
  portrait: boolean
}) {
  const hasContent = portrait ? portraitUrl ?? landscapeUrl : landscapeUrl ?? portraitUrl
  if (!hasContent) return null
  const src = `/widget/html-content/${id}?o=${portrait ? "portrait" : "landscape"}`
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden" }}>
      <iframe
        src={src}
        title="HTML-innhold"
        sandbox=""
        scrolling="no"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </div>
  )
}
