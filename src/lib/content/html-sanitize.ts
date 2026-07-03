import sanitizeHtml from "sanitize-html"

/**
 * Saniterer en opplastet HTML-side for visning på infoskjerm.
 *
 * Sikkerheten hviler på TRE uavhengige lag:
 *  1. Denne saneringen fjerner <script>, event-handlere (on*) og alle eksterne
 *     ressurser (kun data:-URIer beholdes) FØR fila lagres.
 *  2. En injisert CSP-meta (default-src 'none') blokkerer all nettlast selv om
 *     noe CSS skulle slippe gjennom.
 *  3. På skjermen vises fila i en <iframe sandbox> UTEN allow-scripts, så
 *     JavaScript kjøres aldri — uansett hva fila inneholder.
 *
 * CSS bevares fullt ut (inline style og <style>-blokker med @keyframes,
 * transform, animation), så «levende» CSS-animasjon fungerer på skjermen.
 */

// Låser den sanerte sida: ingen nettverk, ingen skript, ingen navigasjon.
// Kun data:-bilder/fonter og inline CSS er tillatt.
const CSP =
  "default-src 'none'; script-src 'none'; img-src data:; style-src 'unsafe-inline'; " +
  "font-src data:; media-src data:; base-uri 'none'; form-action 'none'; frame-src 'none'"

/** ~1,5 MB — matcher grensa i guiden og admin-opplasteren. */
export const HTML_MAX_BYTES = 1_600_000

export interface SanitizeResult {
  ok: boolean
  html?: string
  error?: string
}

const ALLOWED_TAGS = [
  "html", "head", "body", "title", "style",
  "div", "span", "p", "a", "br", "hr", "wbr",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "dl", "dt", "dd",
  "section", "article", "header", "footer", "main", "nav", "aside", "figure", "figcaption", "blockquote",
  "strong", "em", "b", "i", "u", "s", "small", "mark", "sub", "sup", "abbr", "time", "code", "pre", "q", "cite",
  "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "col", "colgroup",
  "img", "picture",
  // Enkel, trygg SVG-delmengde (små bokstaver overlever sanering). Kompleks
  // vektorgrafikk/gradienter: bruk CSS eller et data-URI-bilde i stedet.
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "defs", "desc",
]

// Presentasjons-attributter beholdt på alle tagger. Alt annet (særlig on*-
// handlere) fjernes fordi det ikke står på lista.
const PRESENTATION_ATTRS = [
  "style", "class", "id", "dir", "lang", "title", "role", "align", "width", "height",
  "aria-label", "aria-hidden", "aria-labelledby", "aria-describedby",
  // SVG-presentasjon
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray",
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "points",
  "transform", "opacity", "fill-opacity", "stroke-opacity", "text-anchor",
  "font-family", "font-size", "font-weight", "viewbox", "preserveaspectratio",
]

/** Saniterer råen og pakker den i et komplett, låst dokument klart for iframe-srcdoc/src. */
export function sanitizeSignageHtml(raw: string): SanitizeResult {
  if (typeof raw !== "string" || !raw.trim()) return { ok: false, error: "Fila er tom." }

  const bytes = Buffer.byteLength(raw, "utf8")
  if (bytes > HTML_MAX_BYTES) {
    const mb = (bytes / 1024 / 1024).toFixed(1)
    return { ok: false, error: `Fila er ${mb} MB — maks 1,5 MB. Komprimer bilder eller bruk CSS-gradienter i stedet for foto.` }
  }

  const clean = sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      "*": PRESENTATION_ATTRS,
      a: [...PRESENTATION_ATTRS, "href"],
      img: [...PRESENTATION_ATTRS, "src", "alt", "loading", "decoding"],
    },
    // Kun data:-URIer overlever — all http(s)/javascript:-referanse strippes.
    allowedSchemes: ["data"],
    allowedSchemesByTag: { img: ["data"], a: ["data"] },
    allowProtocolRelative: false,
    // Behold inline CSS uendret (ellers filtrerer sanitize-html bort transform/
    // animation). Trygt her fordi sandbox + CSP nøytraliserer CSS uansett.
    parseStyleAttributes: false,
    // Tillat <style>-blokker (CSS/@keyframes). «Vulnerable» kun uten sandbox —
    // hos oss kjøres innholdet aldri med skript, så det er trygt.
    allowVulnerableTags: true,
  })

  const doc =
    `<!doctype html>\n` +
    `<meta charset="utf-8">\n` +
    `<meta http-equiv="Content-Security-Policy" content="${CSP}">\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">\n` +
    `<style>html,body{margin:0!important;padding:0!important;width:100%;height:100%;overflow:hidden!important;background:#000}</style>\n` +
    clean

  return { ok: true, html: doc }
}
