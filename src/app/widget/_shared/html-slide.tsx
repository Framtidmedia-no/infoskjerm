/**
 * Viser en sanert HTML-side kant til kant i en LÅST sandbox-iframe.
 *
 * `sandbox` uten allow-scripts/allow-same-origin = ingen JavaScript-kjøring,
 * ingen tilgang til vår origin, ingen navigasjon — kun tegning. CSS-animasjon
 * (@keyframes/transform) i fila kjører helt fint. Fila er allerede sanert +
 * har en streng CSP-meta (se html-sanitize.ts), så dette er tredje sikkerhets-
 * lag: selv en ondsinnet fil kan bare animere, aldri gjøre noe annet.
 *
 * Velger stående/liggende variant etter skjermens orientering; faller tilbake
 * til den andre når bare én er lastet opp (samme mønster som fullskjerm-media).
 */
export function HtmlSlide({
  landscapeUrl,
  portraitUrl,
  portrait,
}: {
  landscapeUrl: string | null
  portraitUrl: string | null
  portrait: boolean
}) {
  const url = portrait ? portraitUrl ?? landscapeUrl : landscapeUrl ?? portraitUrl
  if (!url) return null
  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden" }}>
      <iframe
        src={url}
        title="HTML-innhold"
        sandbox=""
        scrolling="no"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </div>
  )
}
