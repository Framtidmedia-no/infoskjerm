/**
 * Server-side Xibo CMS API client.
 *
 * Xibo is the hidden signage engine behind the white-label CMS. The customer
 * never sees Xibo — this app talks to it over the REST API using OAuth2
 * client-credentials. All calls are server-only; the token never reaches the
 * browser.
 */

const XIBO_API_URL = process.env.XIBO_API_URL ?? ""
const XIBO_CLIENT_ID = process.env.XIBO_CLIENT_ID ?? ""
const XIBO_CLIENT_SECRET = process.env.XIBO_CLIENT_SECRET ?? ""

interface CachedToken {
  token: string
  expiresAt: number // epoch ms
}

// Module-level token cache (per server instance). Xibo tokens last ~1h.
let cached: CachedToken | null = null

function assertConfigured() {
  if (!XIBO_API_URL || !XIBO_CLIENT_ID || !XIBO_CLIENT_SECRET) {
    throw new Error(
      "Xibo API er ikke konfigurert. Sett XIBO_API_URL, XIBO_CLIENT_ID og XIBO_CLIENT_SECRET."
    )
  }
}

async function getAccessToken(): Promise<string> {
  assertConfigured()
  const now = Date.now()
  if (cached && cached.expiresAt > now + 30_000) {
    return cached.token
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: XIBO_CLIENT_ID,
    client_secret: XIBO_CLIENT_SECRET,
  })

  const res = await fetch(`${XIBO_API_URL}/api/authorize/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Xibo token-feil (${res.status}): ${text.slice(0, 200)}`)
  }

  const json = (await res.json()) as { access_token: string; expires_in: number }
  cached = {
    token: json.access_token,
    expiresAt: now + (json.expires_in ?? 3600) * 1000,
  }
  return cached.token
}

type QueryValue = string | number | boolean | undefined | null

export interface XiboRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  /** URL-encoded form fields (Xibo expects application/x-www-form-urlencoded). */
  form?: Record<string, QueryValue>
  /** Query-string params for GET. */
  query?: Record<string, QueryValue>
}

/**
 * Low-level Xibo API call. Returns parsed JSON (or null for empty responses).
 * Throws on non-2xx with the Xibo error message.
 */
export async function xiboFetch<T = unknown>(path: string, opts: XiboRequestOptions = {}): Promise<T> {
  assertConfigured()
  const token = await getAccessToken()
  const method = opts.method ?? "GET"

  let url = `${XIBO_API_URL}/api${path.startsWith("/") ? path : `/${path}`}`
  if (opts.query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(opts.query)) {
      if (v !== undefined && v !== null) qs.append(k, String(v))
    }
    const s = qs.toString()
    if (s) url += `?${s}`
  }

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  let bodyInit: BodyInit | undefined

  if (opts.form && method !== "GET") {
    const form = new URLSearchParams()
    for (const [k, v] of Object.entries(opts.form)) {
      if (v !== undefined && v !== null) form.append(k, String(v))
    }
    bodyInit = form
    headers["Content-Type"] = "application/x-www-form-urlencoded"
  }

  const res = await fetch(url, { method, headers, body: bodyInit, cache: "no-store" })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Xibo API ${method} ${path} feilet (${res.status}): ${text.slice(0, 300)}`)
  }

  const text = await res.text()
  if (!text) return null as T
  try {
    return JSON.parse(text) as T
  } catch {
    return null as T
  }
}

// ---------- Typed domain helpers ----------

export interface XiboDisplayGroup {
  displayGroupId: number
  displayGroup: string
  description: string | null
  isDisplaySpecific: number
}

export interface XiboDisplay {
  displayId: number
  display: string
  description: string | null
  loggedIn: number
  lastAccessed: string | null
  defaultLayoutId: number | null
}

export async function listDisplayGroups(): Promise<XiboDisplayGroup[]> {
  // isDisplaySpecific=0 → only real groups, not the auto per-display groups.
  // length=1000 → Xibo paginates to 10 by default; ask for all.
  return xiboFetch<XiboDisplayGroup[]>("/displaygroup", { query: { isDisplaySpecific: 0, length: 1000 } })
}

export async function createDisplayGroup(name: string, description?: string): Promise<XiboDisplayGroup> {
  return xiboFetch<XiboDisplayGroup>("/displaygroup", {
    method: "POST",
    form: { displayGroup: name, description },
  })
}

export async function listDisplays(): Promise<XiboDisplay[]> {
  return xiboFetch<XiboDisplay[]>("/display", { query: { length: 1000 } })
}

export interface XiboAbout {
  version: string
  sourceUrl?: string
}

export async function xiboAbout(): Promise<XiboAbout> {
  return xiboFetch<XiboAbout>("/about")
}
