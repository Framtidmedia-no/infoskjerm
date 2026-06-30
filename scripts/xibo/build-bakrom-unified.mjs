/**
 * Provisions the UNIFIED back-room screen per store: one Xibo layout that embeds
 * /widget/bakrom?store=X (which rotates internal news → own KPI → all-stores
 * week → all-stores year entirely in-app). Schedules it to "{butikk} – Bakrom"
 * and REMOVES the old separate KPI/internal/overview events from that group, so
 * the back-room Pi plays a single, self-rotating page — no fixed-duration guessing.
 *
 * The layout duration is long (the page never needs Xibo to advance it); the
 * in-app rotator owns all timing and adapts to each store's content.
 *
 * Run from repo root:  node scripts/xibo/build-bakrom-unified.mjs
 */

import {
  loadEnv, getToken, makeApi,
  findOrCreateLayout, buildFullscreenWebpage, findDisplayGroupId, scheduleCampaignToGroup,
} from "./lib.mjs"

const GROUP_SUFFIX = " – Bakrom"
const LAYOUT_PREFIX = "Gange-Rolv Bakrom – "
// Long: the page rotates itself, so Xibo should just keep showing it.
const DWELL_SECONDS = 900

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const api = makeApi(env, await getToken(env))

async function fetchStores() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stores?select=id,name&order=name`
  const r = await fetch(url, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } })
  if (!r.ok) throw new Error(`Supabase stores ${r.status}: ${await r.text()}`)
  return r.json()
}

/** Delete every schedule event on this group whose campaign isn't `keepCampaignId`. */
async function pruneGroup(groupId, keepCampaignId, allEvents) {
  let removed = 0
  for (const e of allEvents) {
    if (e.campaignId === keepCampaignId) continue
    if ((e.displayGroups || []).some((g) => g.displayGroupId === groupId)) {
      await api(`/schedule/${e.eventId}`, { method: "DELETE" })
      removed++
    }
  }
  return removed
}

const stores = await fetchStores()
console.log(`→ Bygger ${stores.length} samlede bakrom-layouts mot ${env.XIBO_API_URL}`)
let built = 0
let scheduled = 0
let pruned = 0

for (const store of stores) {
  const layoutName = `${LAYOUT_PREFIX}${store.name}`.slice(0, 50)
  const groupName = `${store.name}${GROUP_SUFFIX}`
  const groupId = await findDisplayGroupId(api, groupName)
  if (!groupId) {
    console.log(`  ⚠ ${store.name}: fant ikke gruppe «${groupName}» — hopper over`)
    continue
  }

  const { layoutId, campaignId } = await findOrCreateLayout(api, layoutName, 1)
  await buildFullscreenWebpage(api, layoutId, `${APP_URL}/widget/bakrom?store=${store.id}`, DWELL_SECONDS)
  built++

  const did = await scheduleCampaignToGroup(api, campaignId, groupId)
  if (did === "scheduled") scheduled++

  // Re-read schedule fresh each store so the just-added event is included.
  const events = (await api(`/schedule?length=2000`)) || []
  const removed = await pruneGroup(groupId, campaignId, events)
  pruned += removed

  console.log(`  ✓ ${store.name} → «${groupName}» (campaign ${campaignId}) ${did}; fjernet ${removed} gamle event(er)`)
}

console.log(`\n✅ ${built} samlede bakrom-layouts, ${scheduled} nye planlegginger, ${pruned} gamle event(er) ryddet.`)
console.log(`   Bakrom-Pi spiller nå ÉN selv-roterende side: nyheter (alle) → KPI egen → alle butikker (uke) → (år).`)
