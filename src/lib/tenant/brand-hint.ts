import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/server"

/**
 * Enhets-husket tenant-branding på /login: etter vellykket innlogging settes en
 * langlivet cookie med brukerens tenant-id, og neste besøk på login-siden viser
 * tenantens logo/navn i stedet for generisk Framtid Tech. Kun branding (navn +
 * logo) leses — ingen data utover det tenanten selv viser i appens topbar.
 */

export const TENANT_HINT_COOKIE = "tenant_brand_hint"
const HINT_MAX_AGE = 60 * 60 * 24 * 180 // 180 dager

export interface LoginBranding {
  name: string
  logoUrl: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Setter (eller fornyer) tenant-hintet etter innlogging. Best-effort. */
export async function setTenantBrandHint(tenantId: string | null): Promise<void> {
  if (!tenantId || !UUID_RE.test(tenantId)) return
  try {
    const store = await cookies()
    store.set(TENANT_HINT_COOKIE, tenantId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: HINT_MAX_AGE,
      path: "/",
    })
  } catch {}
}

/** Leser hintet og laster branding via service-role (login er pre-auth, RLS gjelder ikke). */
export async function getLoginBranding(): Promise<LoginBranding | null> {
  try {
    const store = await cookies()
    const tenantId = store.get(TENANT_HINT_COOKIE)?.value
    if (!tenantId || !UUID_RE.test(tenantId)) return null
    const admin = createAdminClient()
    // logo_url-kolonnen (028) er ikke i den genererte Database-typen ennå → cast
    // (samme mønster som tenant/config-server.ts).
    const { data } = await (admin.from("tenants") as unknown as {
      select: (cols: string) => { eq: (c: string, v: string) => { maybeSingle: () => Promise<{ data: unknown }> } }
    })
      .select("name, logo_url")
      .eq("id", tenantId)
      .maybeSingle()
    const raw = data as { name: string | null; logo_url: string | null } | null
    const name = raw?.name?.trim()
    if (!name) return null
    return { name: name.replace(/\s+AS$/i, ""), logoUrl: raw?.logo_url?.trim() || null }
  } catch {
    return null
  }
}
