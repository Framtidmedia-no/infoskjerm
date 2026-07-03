import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getAdminContext } from "@/lib/admin/admin-context"
import { createAdminClient } from "@/lib/supabase/server"
import { sanitizeSignageHtml } from "@/lib/content/html-sanitize"

/**
 * Saniterer en opplastet HTML-side og lagrer den TRYGGE versjonen i media-
 * bucketen. Råen sendes hit som ren tekst (POST body); serveren fjerner
 * <script>/event-handlere/eksterne referanser og injiserer en streng CSP FØR
 * fila blir tilgjengelig. Klienten får kun tilbake URL-en til den sanerte fila.
 *
 * Går via egen route (ikke server action) fordi HTML-en kan være opptil ~1,5 MB
 * — over server actions' body-grense. På skjermen vises fila kun i en
 * <iframe sandbox> uten script-kjøring (se html-slide.tsx).
 *
 * POST /api/admin/innhold/html-sanitize   body: rå HTML (text/html)
 *   → { url }  eller  { error }
 */

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const AUTHOR_ROLES = new Set(["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"])

export async function POST(req: Request) {
  const ctx = await getAdminContext()
  if (!ctx) return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 })
  if (!AUTHOR_ROLES.has(ctx.role)) return NextResponse.json({ error: "Du har ikke tilgang til å laste opp innhold" }, { status: 403 })
  if (!ctx.effectiveTenantId) return NextResponse.json({ error: "Ingen aktiv tenant valgt" }, { status: 400 })

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return NextResponse.json({ error: "Kunne ikke lese fila" }, { status: 400 })
  }

  const result = sanitizeSignageHtml(raw)
  if (!result.ok || !result.html) {
    return NextResponse.json({ error: result.error ?? "Ugyldig HTML-fil" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const path = `uploads/${randomUUID()}.html`
  // NB: content-type MÅ være «text/html» uten charset-parameter — Storage matcher
  // hele strengen mot bucketens allowed_mime_types (som har «text/html»), så
  // «text/html; charset=utf-8» avvises med 415. Charset kommer fra <meta> i fila.
  const { error } = await supabase.storage
    .from("media")
    .upload(path, Buffer.from(result.html, "utf8"), { contentType: "text/html", upsert: false })
  if (error) {
    return NextResponse.json({ error: `Kunne ikke lagre fila: ${error.message}` }, { status: 500 })
  }

  // Returnerer også den sanerte HTML-en så admin kan forhåndsvise via srcdoc
  // (Storage serverer .html som text/plain, så en direkte iframe-src ville vist
  // rå kildekode — derfor srcdoc i admin og egen serve-route på skjermen).
  const { data } = supabase.storage.from("media").getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl, html: result.html })
}
