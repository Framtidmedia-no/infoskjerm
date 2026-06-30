import { NextResponse } from "next/server"

/**
 * Server-side proxy for kundeavis PDFs so the browser (pdf.js) can fetch them.
 * The flyer CDNs (Sanity for SPAR/EUROSPAR) don't send CORS headers, so a direct
 * client fetch is blocked. We fetch server-side and stream the bytes back with
 * permissive caching. An allowlist of hosts keeps this from being an open proxy
 * (SSRF guard): only known flyer CDNs are reachable.
 */

const ALLOWED_HOSTS = ["cdn.sanity.io"] as const

export async function GET(req: Request): Promise<Response> {
  const target = new URL(req.url).searchParams.get("url")
  if (!target) return NextResponse.json({ error: "Mangler url" }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: "Ugyldig url" }, { status: 400 })
  }

  // Finn det matchende, literale hostnavnet (konstant) — så host ikke kan styres
  // av input. Kun path/query er dynamisk; det fjerner SSRF-flagget.
  const host = ALLOWED_HOSTS.find((h) => h === parsed.hostname)
  if (parsed.protocol !== "https:" || !host || !parsed.pathname.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Ikke tillatt kilde" }, { status: 403 })
  }

  const safeUrl = new URL(parsed.pathname + parsed.search, `https://${host}`).toString()

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const upstream = await fetch(safeUrl, { signal: controller.signal, cache: "no-store" })
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: `Kilde svarte ${upstream.status}` }, { status: 502 })
    }
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    })
  } catch {
    return NextResponse.json({ error: "Kunne ikke hente PDF" }, { status: 502 })
  } finally {
    clearTimeout(timeout)
  }
}
