/**
 * Klargjør en opplastet HTML-side for visning på infoskjerm.
 *
 * Vi sanitizer IKKE lenger og BEHOLDER <script> — HTML-sida kjøres som en app
 * (CSS-animasjon ELLER JavaScript). Sikkerhetsgrensa er SANDKASSEN, ikke sanering:
 *  - På skjermen: <iframe sandbox="allow-scripts"> UTEN allow-same-origin.
 *  - Content-routen (/widget/html-content/<id>) setter CSP `sandbox allow-scripts`
 *    på svaret, så fila er jailet også om noen åpner URL-en direkte.
 * Da kan kundens kode kjøre JS og snakke med nettet, men ALDRI røre vår origin,
 * sesjon, cookies eller en annen butikks data (nettleseren håndhever det).
 *
 * Best offline: en SELVSTENDIG fil (alt inline — CSS, JS, bilder som data-URI,
 * ingen eksterne kall) fortsetter å spille selv om Pi-en mister nettet. En side
 * som henter ting fra nettet er skjør offline. Se docs/html-innhold-guide.md.
 */

/** ~4 MB — under Vercels 4,5 MB request-grense (fila POST-es til sanitize-routen). */
export const HTML_MAX_BYTES = 4_000_000

export interface PrepareResult {
  ok: boolean
  html?: string
  error?: string
}

/** Validerer størrelse og pakker en fragment-fil i et minimalt dokument. Fulle
 * dokumenter (starter med <!doctype/<html>) beholdes uendret for å unngå quirks-
 * mode. Alt innhold — inkludert <script> — bevares. */
export function prepareSignageHtml(raw: string): PrepareResult {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Fila er tom." }

  const bytes = Buffer.byteLength(raw, "utf8")
  if (bytes > HTML_MAX_BYTES) {
    return { ok: false, error: `Fila er ${(bytes / 1024 / 1024).toFixed(1)} MB — maks 4 MB. Komprimer bilder eller legg dem inn som data-URI.` }
  }

  const head = raw.trimStart().slice(0, 200).toLowerCase()
  const isFullDoc = head.startsWith("<!doctype") || head.startsWith("<html")
  const html = isFullDoc
    ? raw
    : `<!doctype html><html><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden}</style>` +
      `</head><body>${raw}</body></html>`

  return { ok: true, html }
}
