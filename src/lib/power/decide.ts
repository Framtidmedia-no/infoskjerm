import type { SupabaseClient } from "@supabase/supabase-js"
import { resolveDesiredPower, type OpeningHours, type PowerValue, type PowerDecision } from "./schedule"

/**
 * Slår opp en skjerm på token og beregner ønsket strømtilstand nå — delt av
 * API-et (/api/screen/power) og spillersiden (/skjerm/<token>). Forventer en
 * service-role-klient: token er kapabiliteten, oppslaget går på tvers av RLS.
 */

export interface ScreenPowerRow {
  id: string
  store_id: string | null
  power_mode: string | null
  power_on_lead_min: number | null
  power_off_lag_min: number | null
  power_override: string | null
  power_override_until: string | null
}

export async function decideForScreenToken(
  supabase: SupabaseClient,
  token: string,
): Promise<{ screen: ScreenPowerRow; decision: PowerDecision } | null> {
  const { data } = await supabase
    .from("screens")
    .select("id, store_id, power_mode, power_on_lead_min, power_off_lag_min, power_override, power_override_until")
    .eq("token", token)
    .maybeSingle()
  const screen = data as unknown as ScreenPowerRow | null
  if (!screen) return null

  let hours: OpeningHours | null = null
  if (screen.store_id) {
    const { data: store } = await supabase
      .from("stores")
      .select("apningstider")
      .eq("id", screen.store_id)
      .maybeSingle()
    hours = ((store as unknown as { apningstider: OpeningHours | null } | null)?.apningstider) ?? null
  }

  const decision = resolveDesiredPower({
    hours,
    mode: screen.power_mode === "always_on" ? "always_on" : "auto",
    leadMin: screen.power_on_lead_min ?? 15,
    lagMin: screen.power_off_lag_min ?? 15,
    override: screen.power_override === "on" || screen.power_override === "off" ? (screen.power_override as PowerValue) : null,
    overrideUntil: screen.power_override_until,
  })
  return { screen, decision }
}
