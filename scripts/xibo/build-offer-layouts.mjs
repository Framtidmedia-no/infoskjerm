/**
 * Provisions one full-screen "Tilbud" layout per store, embedding the app's
 * /widget/tilbud?store=<id> page (side panel + poster/PDF + ticker). These are
 * NOT scheduled here — scheduling is dynamic: the layout is added to / removed
 * from the store's display group based on whether the store has active offers
 * (see src/lib/xibo/offers.ts + /api/cron/reconcile-offers + the publish hook).
 *
 * Idempotent: re-running finds existing layouts by name and rebuilds them.
 *
 * Run from repo root:  node scripts/xibo/build-offer-layouts.mjs
 */

import { loadEnv, getToken, makeApi, tilbudUri, buildFullscreenWebpage } from "./lib.mjs"

const LAYOUT_PREFIX = "Gange-Rolv Tilbud – "

const env = loadEnv()
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"
const token = await getToken(env)
const api = makeApi(env, token)

async function fetchStores() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/stores?select=id,name&order=name`
  const r = await fetch(url, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
  })
  if (!r.ok) throw new Error(`Supabase stores ${r.status}: ${await r.text()}`)
  return r.json()
}

async function findOrCreateLayout(name) {
  const found = (await api(`/layout?layout=${encodeURIComponent(name)}&length=50`)).find((l) => l.layout === name && l.parentId === null)
  if (found) return { layoutId: found.layoutId, campaignId: found.campaignId }
  const created = await api(`/layout`, { method: "POST", form: { name: name.slice(0, 50), resolutionId: 1 } })
  const fresh = (await api(`/layout?layoutId=${created.layoutId}`))[0]
  return { layoutId: created.layoutId, campaignId: fresh.campaignId }
}

const stores = await fetchStores()
console.log(`→ Bygger ${stores.length} tilbud-helsider mot ${env.XIBO_API_URL} (planlegges dynamisk)`)
let built = 0

for (const store of stores) {
  const layoutName = `${LAYOUT_PREFIX}${store.name}`.slice(0, 50)
  const { layoutId, campaignId } = await findOrCreateLayout(layoutName)
  await buildFullscreenWebpage(api, layoutId, tilbudUri(APP_URL, store.id))
  built++
  console.log(`  ✓ ${store.name} — tilbud-layout «${layoutName}» (campaign ${campaignId})`)
}

console.log(`\n✅ ${built} tilbud-layouts bygget. Kjør reconcile (cron /api/cron/reconcile-offers) for å planlegge butikker som har aktive tilbud nå.`)
