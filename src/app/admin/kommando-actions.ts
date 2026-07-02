"use server"

import { getAdminContext } from "@/lib/admin/admin-context"
import { createClient } from "@/lib/supabase/server"
import { storedAudienceOf } from "@/lib/content/audience"

/**
 * Søket bak ⌘K-paletten. Kjøres med brukerens egen klient (RLS scoper
 * butikk-/rolletilgang); tenant-filteret scoper super_admin under act-as
 * (app-lags-scoping, jf. superadmin-arkitekturen).
 */

export interface KommandoTreff {
  gruppe: "innhold" | "butikker" | "brukere"
  label: string
  sub: string | null
  href: string
}

const BRUKER_SOK_ROLLER = ["super_admin", "chain_manager", "area_manager", "store_manager"]

export async function kommandoSok(query: string): Promise<KommandoTreff[]> {
  const q = query.trim().replace(/[,()]/g, " ")
  if (q.length < 2) return []
  const ctx = await getAdminContext()
  if (!ctx) return []
  const supabase = await createClient()
  const like = `%${q}%`
  const tenant = ctx.effectiveTenantId

  const [innhold, butikker, brukere] = await Promise.all([
    supabase
      .from("content_items")
      .select("id, title, type, body")
      .eq("tenant_id", tenant)
      .ilike("title", like)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("stores")
      .select("id, name, city")
      .eq("tenant_id", tenant)
      .ilike("name", like)
      .order("name")
      .limit(4),
    BRUKER_SOK_ROLLER.includes(ctx.role)
      ? supabase
          .from("users")
          .select("id, full_name, email")
          .eq("tenant_id", tenant)
          .or(`full_name.ilike.${like},email.ilike.${like}`)
          .limit(4)
      : Promise.resolve({ data: null }),
  ])

  const treff: KommandoTreff[] = []
  for (const c of innhold.data ?? []) {
    const audience = storedAudienceOf(c.type, (c.body as { audience?: unknown } | null)?.audience)
    treff.push({
      gruppe: "innhold",
      label: c.title,
      sub: audience === "kunde" ? "Kundeskjerm" : "Internt innhold",
      href: audience === "kunde" ? `/admin/kundeinnhold/${c.id}` : `/admin/innhold/${c.id}`,
    })
  }
  for (const s of butikker.data ?? []) {
    treff.push({ gruppe: "butikker", label: s.name, sub: s.city, href: `/admin/stores/${s.id}` })
  }
  for (const u of brukere.data ?? []) {
    treff.push({ gruppe: "brukere", label: u.full_name || u.email || "Ukjent", sub: u.email, href: "/admin/users" })
  }
  return treff
}
