/**
 * Ren målrettingslogikk for innholdslevering — delt av fetchLiveContent og
 * tester (ingen Supabase-avhengighet, så reglene kan enhets-testes direkte).
 */

/** content_targets-rad slik leveringen leser den (embedded på content_items). */
export interface ContentTarget {
  target_all: boolean | null
  store_id: string | null
  tag_id: string | null
  screen_id: string | null
}

export interface TargetContext {
  /** Butikk-konteksten widgeten rendres i (null = base-feed uten butikk). */
  storeId: string | null
  /** Skjermen (screens.id) når widgeten lastes via /skjerm/<token>. */
  screenId?: string | null
  /** tag_id → butikk-id-er, for tag-basert målretting. */
  tagToStores?: Map<string, Set<string>>
}

/**
 * Avgjør om et innslag skal vises i gitt kontekst.
 *
 * Skjerm-målretting har forrang: har innslaget screen-targets, vises det KUN på
 * akkurat de skjermene. Uten skjermkontekst (forhåndsvisning, gamle ?store=-URLer,
 * base-feed) vises et skjerm-målrettet innslag ikke i det hele tatt.
 * Ellers gjelder target_all / butikk / tagg som før, og base-feeden (storeId null)
 * viser alt.
 */
export function matchesTargets(targets: ContentTarget[], ctx: TargetContext): boolean {
  const screenTargets = targets.filter((t) => t.screen_id)
  if (screenTargets.length > 0) {
    return !!ctx.screenId && screenTargets.some((t) => t.screen_id === ctx.screenId)
  }
  if (!ctx.storeId) return true
  if (targets.some((t) => t.target_all)) return true
  for (const t of targets) {
    if (t.store_id === ctx.storeId) return true
    if (t.tag_id && ctx.tagToStores?.get(t.tag_id)?.has(ctx.storeId)) return true
  }
  return false
}
