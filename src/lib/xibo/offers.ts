import { xiboFetch } from "./client"
import { createAdminClient } from "@/lib/supabase/server"
import { fetchLiveContent } from "@/lib/content/live"

/**
 * Keeps the per-store full-screen "Tilbud" Xibo layout scheduled only while that
 * store has active offers. Offers are date-windowed, so presence changes over
 * time without any user action — this reconcile runs on offer publish/delete
 * (for immediacy) and from a cron (to catch validity-window boundaries).
 *
 * The per-store Tilbud layouts + the store display groups are provisioned by
 * scripts/xibo/build-offer-layouts.mjs; this only adds/removes schedule events.
 */

const LAYOUT_PREFIX = "Gange-Rolv Tilbud – "
const ALWAYS_DAYPART_ID = 2

/** Layout name as provisioned by the build script (kept in sync, 50-char cap). */
export function offerLayoutName(storeName: string): string {
  return `${LAYOUT_PREFIX}${storeName}`.slice(0, 50)
}

interface XiboLayout {
  layoutId: number
  campaignId: number
  layout: string
  parentId: number | null
}
interface XiboGroup {
  displayGroupId: number
  displayGroup: string
}
interface XiboScheduleEvent {
  eventId: number
  campaignId: number
  displayGroups?: { displayGroupId: number }[]
}

export interface ReconcileResult {
  checked: number
  scheduled: number
  unscheduled: number
  skipped: string[]
}

/**
 * @param onlyStoreIds  Limit the reconcile to these store ids (e.g. on publish);
 *                      omit to reconcile every store (cron).
 */
export async function reconcileOfferSchedules(onlyStoreIds?: string[]): Promise<ReconcileResult> {
  const supabase = createAdminClient()
  const { data: stores } = await supabase.from("stores").select("id, name").order("name")
  const result: ReconcileResult = { checked: 0, scheduled: 0, unscheduled: 0, skipped: [] }
  if (!stores || stores.length === 0) return result

  const targetStores = onlyStoreIds ? stores.filter((s) => onlyStoreIds.includes(s.id)) : stores
  if (targetStores.length === 0) return result

  // Load Xibo state once.
  const [layouts, groups, events] = await Promise.all([
    xiboFetch<XiboLayout[]>("/layout", { query: { length: 1000 } }),
    xiboFetch<XiboGroup[]>("/displaygroup", { query: { isDisplaySpecific: 0, length: 1000 } }),
    xiboFetch<XiboScheduleEvent[]>("/schedule", { query: { length: 2000 } }),
  ])

  const campaignByLayoutName = new Map<string, number>()
  for (const l of layouts ?? []) {
    if (l.parentId === null) campaignByLayoutName.set(l.layout, l.campaignId)
  }
  const groupIdByName = new Map((groups ?? []).map((g) => [g.displayGroup, g.displayGroupId]))

  for (const store of targetStores) {
    result.checked++
    const campaignId = campaignByLayoutName.get(offerLayoutName(store.name))
    const dgId = groupIdByName.get(store.name)
    if (!campaignId || !dgId) {
      result.skipped.push(store.name)
      continue
    }

    const hasOffers = (await fetchLiveContent(store.id, ["slide"])).length > 0
    const existing = (events ?? []).filter(
      (e) => e.campaignId === campaignId && (e.displayGroups ?? []).some((g) => g.displayGroupId === dgId)
    )

    if (hasOffers && existing.length === 0) {
      await xiboFetch("/schedule", {
        method: "POST",
        form: {
          eventTypeId: 1,
          campaignId,
          "displayGroupIds[]": dgId,
          dayPartId: ALWAYS_DAYPART_ID,
          syncTimezone: 0,
          isPriority: 0,
          displayOrder: 0,
          fromDt: "",
          toDt: "",
        },
      })
      result.scheduled++
    } else if (!hasOffers && existing.length > 0) {
      for (const e of existing) {
        await xiboFetch(`/schedule/${e.eventId}`, { method: "DELETE" })
      }
      result.unscheduled++
    }
  }

  return result
}

/** Best-effort reconcile that never throws — for use inside publish actions. */
export async function reconcileOffersSafe(onlyStoreIds?: string[]): Promise<void> {
  try {
    await reconcileOfferSchedules(onlyStoreIds)
  } catch (err) {
    console.error("[offers] reconcile feilet (ignorert, cron retter opp):", err)
  }
}
