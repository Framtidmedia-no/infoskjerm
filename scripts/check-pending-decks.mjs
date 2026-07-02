/**
 * Lettvekts forsjekk for render-decks-workflowen: teller live PowerPoint-slides
 * som mangler ferdige sidebilder (pages tom, eller rendret fra en annen fil).
 * Kun Node-innebygde moduler → ingen npm install → nesten gratis å polle ofte.
 * Skriver "pending=<N>" til GITHUB_OUTPUT så workflowen kun kjører den tunge
 * LibreOffice-renderingen når det faktisk finnes et deck å gjøre.
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { readFileSync, appendFileSync } from "node:fs"

function env(key) {
  if (process.env[key]) return process.env[key]
  try {
    const line = readFileSync(".env.local", "utf8").split("\n").find((l) => l.startsWith(`${key}=`))
    return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined
  } catch {
    return undefined
  }
}

const SB = env("NEXT_PUBLIC_SUPABASE_URL")
const KEY = env("SUPABASE_SERVICE_ROLE_KEY")
if (!SB || !KEY) {
  console.error("Mangler NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const items = await (
  await fetch(`${SB}/rest/v1/content_items?select=id,type,body&type=in.(slide,news)&status=eq.live&limit=500`, { headers: H })
).json()

// PDF forhåndsrendres KUN i fullskjerm-modus (ellers vises PDF som iframe i
// widgetene). Fullskjerm-items kan i tillegg ha en stående variant (portraitUrl).
const deckKind = (u) => {
  const s = String(u || "").toLowerCase().split("?")[0]
  return s.endsWith(".pptx") || s.endsWith(".ppt") ? "ppt" : s.endsWith(".pdf") ? "pdf" : null
}

const pending = (items || []).reduce((n, x) => {
  const b = x.body || {}
  // Nyheter prerendres kun i fullskjerm-modus (standard nyhet bruker aldri pages).
  if (x.type === "news" && b.imageMode !== "fullskjerm") return n
  const variants = [
    { url: b.imageUrl, pages: b.pages, renderedFor: b.pagesFor },
    { url: b.portraitUrl, pages: b.portraitPages, renderedFor: b.portraitPagesFor },
  ]
  for (const v of variants) {
    const kind = deckKind(v.url)
    if (!kind) continue
    if (kind === "pdf" && b.imageMode !== "fullskjerm") continue
    const have = Array.isArray(v.pages) && v.pages.length > 0
    if (!have || v.renderedFor !== v.url) n++
  }
  return n
}, 0)

console.log(`Ventende deck-varianter: ${pending}`)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `pending=${pending}\n`)
