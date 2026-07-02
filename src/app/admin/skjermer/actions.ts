"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/admin/require-role"
import { logAudit } from "@/lib/admin/audit"
import { resolveDesiredPower, type OpeningHours, type PowerMode, type PowerValue } from "@/lib/power/schedule"

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

/** screens-power-kolonner (20260702) er ikke i den genererte typen → smalt cast. */
type ScreensPowerTable = {
  select: (c: string) => {
    eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: PowerRow | null; error: { message: string } | null }> }
  }
  update: (v: Record<string, string | number | null>) => { eq: (c: string, val: string) => Promise<{ error: { message: string } | null }> }
}
type PowerRow = {
  id: string
  store_id: string | null
  power_mode: string | null
  power_on_lead_min: number | null
  power_off_lag_min: number | null
}

/**
 * Setter strømmodus for en skjerm: 'auto' følger butikkens åpningstider
 * (± lead/lag), 'always_on' slår aldri av automatisk. Bytte av modus nuller
 * en ev. manuell overstyring — modusvalget skal alltid vinne synlig.
 */
export async function setScreenPowerMode(
  screenId: string,
  mode: PowerMode,
  leadMin?: number,
  lagMin?: number,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireRole([...MANAGEMENT_ROLES])
  const m: PowerMode = mode === "always_on" ? "always_on" : "auto"
  const clamp = (v: number | undefined, fallback: number) =>
    Number.isFinite(v) ? Math.min(180, Math.max(0, Math.round(v as number))) : fallback

  const update: Record<string, string | number | null> = {
    power_mode: m,
    power_override: null,
    power_override_until: null,
  }
  if (leadMin !== undefined) update.power_on_lead_min = clamp(leadMin, 15)
  if (lagMin !== undefined) update.power_off_lag_min = clamp(lagMin, 15)

  const { error } = await (supabase.from("screens") as unknown as ScreensPowerTable).update(update).eq("id", screenId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "screen.power_mode", entityType: "screen", entityId: screenId, summary: `Strømmodus: ${m === "auto" ? "følger åpningstider" : "alltid på"}`, metadata: { mode: m } })
  revalidatePath("/admin/skjermer", "layout")
  revalidatePath("/admin/stores", "layout")
  return { ok: true }
}

/**
 * Manuell «slå på/av nå». Overstyringen varer til neste planlagte overgang i
 * åpningstidene (beregnet her, med skjermens lead/lag) — uten plan: 12 timer.
 * Pi-agenten plukker den opp på neste poll (≤ 60 s).
 */
export async function overrideScreenPower(
  screenId: string,
  value: PowerValue,
): Promise<{ ok: boolean; until?: string; error?: string }> {
  const { supabase, userId } = await requireRole([...MANAGEMENT_ROLES])
  const v: PowerValue = value === "off" ? "off" : "on"
  const table = supabase.from("screens") as unknown as ScreensPowerTable

  const { data: screen } = await table
    .select("id, store_id, power_mode, power_on_lead_min, power_off_lag_min")
    .eq("id", screenId)
    .maybeSingle()
  if (!screen) return { ok: false, error: "Ikke funnet" }

  let hours: OpeningHours | null = null
  if (screen.store_id) {
    const { data: store } = await (supabase.from("stores") as unknown as {
      select: (c: string) => { eq: (col: string, val: string) => { maybeSingle: () => Promise<{ data: { apningstider: OpeningHours | null } | null }> } }
    }).select("apningstider").eq("id", screen.store_id).maybeSingle()
    hours = store?.apningstider ?? null
  }

  // Utløp = neste planlagte overgang (overstyringen «leverer stafettpinnen»
  // tilbake til planen) — uten konfigurerte tider: 12 timer.
  const decision = resolveDesiredPower({
    hours,
    mode: "auto",
    leadMin: screen.power_on_lead_min ?? 15,
    lagMin: screen.power_off_lag_min ?? 15,
  })
  const until = decision.nextTransition ?? new Date(Date.now() + 12 * 60 * 60 * 1000)

  const { error } = await table
    .update({ power_override: v, power_override_until: until.toISOString() })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "screen.power_override", entityType: "screen", entityId: screenId, summary: v === "on" ? "Slo på skjermen manuelt" : "Slo av skjermen manuelt", metadata: { value: v, until: until.toISOString() } })
  revalidatePath("/admin/skjermer", "layout")
  revalidatePath("/admin/stores", "layout")
  return { ok: true, until: until.toISOString() }
}

/** Fjerner manuell overstyring — skjermen følger planen igjen umiddelbart. */
export async function clearScreenPowerOverride(screenId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, userId } = await requireRole([...MANAGEMENT_ROLES])
  const { error } = await (supabase.from("screens") as unknown as ScreensPowerTable)
    .update({ power_override: null, power_override_until: null })
    .eq("id", screenId)
  if (error) return { ok: false, error: error.message }

  await logAudit({ userId, action: "screen.power_override_clear", entityType: "screen", entityId: screenId, summary: "Fjernet manuell strøm-overstyring" })
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
