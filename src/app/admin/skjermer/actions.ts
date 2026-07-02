"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"

const MANAGEMENT_ROLES = ["super_admin", "chain_manager", "area_manager"] as const

export type Flate = "kunde" | "intern"
export type Orientation = "portrait" | "landscape"

export interface Assignment {
  flate: Flate
  avdeling: string
  orientation: Orientation
}

/** screens-tabellen har kolonner (037/038) som ennå ikke er i den genererte typen → smalt cast. */
type ScreensTable = {
  select: (c: string) => {
    eq: (col: string, val: string | number) => {
      eq: (col: string, val: string | number) => { maybeSingle: () => Promise<{ data: { id: string; token: string } | null; error: { message: string } | null }> }
    }
  }
  update: (v: Record<string, string | number>) => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> }
  insert: (v: Record<string, string | number | null>) => { select: (c: string) => { single: () => Promise<{ data: { id: string; token: string } | null; error: { message: string } | null }> } }
  delete: () => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> }
}

function normalize(a: Assignment): Assignment {
  return {
    flate: a.flate === "intern" ? "intern" : "kunde",
    orientation: a.orientation === "landscape" ? "landscape" : "portrait",
    avdeling: (a.avdeling || "felles").trim() || "felles",
  }
}

function newToken(): string {
  return "sk_" + randomBytes(24).toString("hex")
}

/**
 * Setter hva en eksisterende skjerm-rad (token) skal vise: flate + avdeling +
 * orientering. /skjerm/<token> rendrer deretter — Pi/telefon rører vi aldri.
 * RLS på screens er tenant-scopet; area/store-roller begrenses til egne enheter.
 */
export async function setScreenAssignment(
  screenId: string,
  assignment: Assignment
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireRole([...MANAGEMENT_ROLES])
  const a = normalize(assignment)

  const { error } = await (supabase.from("screens") as unknown as ScreensTable)
    .update({ flate: a.flate, avdeling: a.avdeling, orientation: a.orientation })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "screen.assignment", entityType: "screen", entityId: screenId, summary: `Satte skjerm: ${a.flate} / ${a.avdeling} / ${a.orientation}`, metadata: { ...a } })
  revalidatePath("/admin/skjermer", "layout")
  revalidatePath("/admin/stores", "layout")
  return { ok: true }
}

/**
 * Binder en TILKOBLET Xibo-skjerm (display) til en tildeling. Finnes raden
 * (xibo_display_id) fra før → oppdater; ellers opprett med ny token. Slik blir
 * fleet-oversikten kilden: hver fysiske skjerm styres inline, ubegrenset per flate.
 * Returnerer token (URL-en Pi-en laster via sin Xibo-layout).
 */
export async function assignDisplay(
  displayId: number,
  storeId: string,
  assignment: Assignment
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const { supabase, userId, tenantId } = await requireRole([...MANAGEMENT_ROLES])
  const a = normalize(assignment)
  const table = supabase.from("screens") as unknown as ScreensTable

  const { data: existing } = await table
    .select("id, token")
    .eq("tenant_id", tenantId)
    .eq("xibo_display_id", displayId)
    .maybeSingle()

  if (existing) {
    const { error } = await table
      .update({ flate: a.flate, avdeling: a.avdeling, orientation: a.orientation })
      .eq("id", existing.id)
    if (error) return { ok: false, error: error.message }
    await logAudit({ userId, action: "screen.assignment", entityType: "screen", entityId: existing.id, summary: `Skjerm ${displayId}: ${a.flate} / ${a.avdeling} / ${a.orientation}`, metadata: { displayId, ...a } })
    revalidatePath("/admin/skjermer", "layout")
    revalidatePath("/admin/stores", "layout")
    return { ok: true, token: existing.token }
  }

  const token = newToken()
  const { data: created, error } = await table
    .insert({
      tenant_id: tenantId,
      store_id: storeId,
      xibo_display_id: displayId,
      name: `Skjerm ${displayId}`,
      token,
      flate: a.flate,
      avdeling: a.avdeling,
      orientation: a.orientation,
    })
    .select("id, token")
    .single()
  if (error || !created) return { ok: false, error: error?.message ?? "Kunne ikke opprette skjerm" }

  await logAudit({ userId, action: "screen.bind", entityType: "screen", entityId: created.id, summary: `Bandt Xibo-skjerm ${displayId}: ${a.flate} / ${a.avdeling} / ${a.orientation}`, metadata: { displayId, ...a } })
  revalidatePath("/admin/skjermer", "layout")
  revalidatePath("/admin/stores", "layout")
  return { ok: true, token: created.token }
}

/**
 * Oppretter en KIOSK-skjerm (telefon/nettbrett som skjerm) for en butikk — en
 * screens-rad uten xibo_display_id. Du laster /skjerm/<token> direkte i nettleser
 * på enheten. Ubegrenset antall per butikk.
 */
export async function addKiosk(
  storeId: string,
  flate: Flate
): Promise<{ ok: boolean; token?: string; error?: string }> {
  const { supabase, userId, tenantId } = await requireRole([...MANAGEMENT_ROLES])
  const f: Flate = flate === "intern" ? "intern" : "kunde"
  const token = newToken()

  const { data: created, error } = await (supabase.from("screens") as unknown as ScreensTable)
    .insert({
      tenant_id: tenantId,
      store_id: storeId,
      xibo_display_id: null,
      name: f === "intern" ? "Kiosk internskjerm" : "Kiosk kundeskjerm",
      token,
      flate: f,
      avdeling: "felles",
      orientation: f === "intern" ? "landscape" : "portrait",
    })
    .select("id, token")
    .single()
  if (error || !created) return { ok: false, error: error?.message ?? "Kunne ikke opprette kiosk-skjerm" }

  await logAudit({ userId, action: "screen.kiosk_add", entityType: "screen", entityId: created.id, summary: `La til kiosk-skjerm (${f})`, metadata: { storeId, flate: f } })
  revalidatePath("/admin/skjermer", "layout")
  revalidatePath("/admin/stores", "layout")
  return { ok: true, token: created.token }
}

const MAX_SCREEN_NAME = 60

/**
 * Kallenavn på en skjerm (screens.name) — vises i skjerm-kortene og i
 * skjermvelgeren ved publisering, så tenantene kan navngi «Kassaskjerm»,
 * «Vindu mot gata» osv. selv.
 */
export async function renameScreen(screenId: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireRole([...MANAGEMENT_ROLES])
  const trimmed = name.trim().slice(0, MAX_SCREEN_NAME)
  if (!trimmed) return { ok: false, error: "Navnet kan ikke være tomt" }

  const { error } = await (supabase.from("screens") as unknown as ScreensTable)
    .update({ name: trimmed })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "screen.rename", entityType: "screen", entityId: screenId, summary: `Ga skjermen kallenavnet «${trimmed}»` })
  revalidatePath("/admin/skjermer", "layout")
  revalidatePath("/admin/stores", "layout")
  return { ok: true }
}

/** Sletter en skjerm-rad (kiosk eller frigjør en Xibo-binding). */
export async function deleteScreenRow(screenId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireRole([...MANAGEMENT_ROLES])
  const { error } = await (supabase.from("screens") as unknown as ScreensTable).delete().eq("id", screenId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "screen.delete", entityType: "screen", entityId: screenId, summary: "Slettet skjerm-rad" })
  revalidatePath("/admin/skjermer", "layout")
  revalidatePath("/admin/stores", "layout")
  return { ok: true }
}
