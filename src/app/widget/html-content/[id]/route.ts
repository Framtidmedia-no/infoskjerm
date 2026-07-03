import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * Serverer den sanerte HTML-en for et `html`-innholdselement med
 * `Content-Type: text/html` slik at den faktisk RENDRES i skjermens iframe.
 *
 * Hvorfor egen route: Supabase Storage serverer opplastet HTML som `text/plain`
 * (anti-XSS på storage-domenet), så en direkte iframe-src mot storage ville vist
 * rå kildekode. Denne routen henter den (allerede sanerte) fila og re-serverer
 * den som text/html med en streng CSP. På skjermen ligger den uansett i en
 * <iframe sandbox> uten script-kjøring — dette er visnings-siden av den flyten.
 *
 * GET /widget/html-content/<contentId>?o=portrait|landscape
 */

export const dynamic = "force-dynamic"

const HTML_CSP =
  "default-src 'none'; script-src 'none'; img-src data:; style-src 'unsafe-inline'; " +
  "font-src data:; media-src data:; base-uri 'none'; form-action 'none'; frame-ancestors *"

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const portrait = new URL(req.url).searchParams.get("o") === "portrait"

  const supabase = createAdminClient()
  const { data } = await supabase.from("content_items").select("type, body").eq("id", id).maybeSingle()
  if (!data || data.type !== "html") return new NextResponse("Not found", { status: 404 })

  const body = (data.body ?? {}) as { htmlLandscape?: string | null; htmlPortrait?: string | null }
  const url = portrait ? body.htmlPortrait || body.htmlLandscape : body.htmlLandscape || body.htmlPortrait
  if (!url) return new NextResponse("No content", { status: 404 })

  // Kun våre egne media-URLer — ikke la routen bli en åpen proxy.
  const upstream = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  if (!upstream || !url.startsWith(`${upstream}/storage/v1/object/public/media/`)) {
    return new NextResponse("Invalid content url", { status: 400 })
  }

  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return new NextResponse("Upstream error", { status: 502 })
  const html = await res.text()

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": HTML_CSP,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=60",
    },
  })
}
