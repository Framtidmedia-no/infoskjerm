/**
 * Viser en opplastet HTML-side kant til kant i en sandbox-iframe.
 *
 * `sandbox="allow-scripts"` UTEN allow-same-origin = JavaScript OG CSS-animasjon
 * kjører, men koden er jailet i en opaque origin: ingen tilgang til vår origin,
 * sesjon, cookies eller andre butikkers data, og ingen topp-navigasjon. Nett er
 * tillatt (jailet). Fila serveres via /widget/html-content/<id> som text/html.
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
        sandbox="allow-scripts"
        scrolling="no"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </div>
  )
}
