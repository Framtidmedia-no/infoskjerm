/**
 * Rebuilds the Gange-Rolv base template (Xibo layout 12 / campaign 8) as the
 * DYNAMIC signage template. Idempotent: checks out layout 12, wipes its regions,
 * and rebuilds four zones, then publishes (campaign id 8 is preserved).
 *
 *   ┌────────────────────────────┬──────────────┐
 *   │  News (DataSet View,       │  Digital     │
 *   │  rotates through DataSet 1)│  clock+date  │
 *   │                            ├──────────────┤
 *   │                            │  Yr weather  │
 *   │                            │  (webpage)   │
 *   ├────────────────────────────┴──────────────┤
 *   │  Ticker (green)                            │
 *   └────────────────────────────────────────────┘
 *
 * Run from the repo root:  node scripts/xibo/build-base-template.mjs
 * Reads XIBO_* and NEXT_PUBLIC_APP_URL from .env.local.
 *
 * Property names verified live against Xibo 4.4.4 (module/template definitions).
 */

import { readFileSync } from "node:fs"

// ---------- config ----------
// The base template is addressed by its CAMPAIGN id, which is stable. Xibo
// changes the layout id on every publish, so we resolve the current layout id
// from the campaign each run (keeps this script idempotent across rebuilds).
const BASE_CAMPAIGN_ID = 8
const NEWS_DATASET_ID = 1
const PER_ITEM_SECONDS = 12
// Max news items in the rotation. Xibo requires numItems > 1 with per-item
// duration; fewer actual rows simply show fewer pages.
const MAX_NEWS_ITEMS = 50
// Default weather location for the shared template (Ålesund). Per-store weather
// needs per-store layouts — that's the #3 scheduling spike.
const WEATHER = { lat: "62.4722", lon: "6.1495", navn: "Ålesund" }
const TICKER_TEXT = "Velkommen til Gange-Rolv · Husk medlemsfordeler i kassen · God handel!"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]
    })
)
const BASE = env.XIBO_API_URL
const APP_URL = env.NEXT_PUBLIC_APP_URL || "https://infoskjerm-seven.vercel.app"

// ---------- api helpers ----------
async function getToken() {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.XIBO_CLIENT_ID,
    client_secret: env.XIBO_CLIENT_SECRET,
  })
  const r = await fetch(`${BASE}/api/authorize/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`)
  return (await r.json()).access_token
}

let TOKEN
async function api(path, opts = {}) {
  const r = await fetch(`${BASE}/api${path}`, {
    method: opts.method || "GET",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(opts.form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: opts.form ? new URLSearchParams(opts.form) : undefined,
  })
  const text = await r.text()
  let json = null
  try { json = JSON.parse(text) } catch {}
  if (!r.ok) throw new Error(`${opts.method || "GET"} ${path} → ${r.status}: ${text.slice(0, 300)}`)
  return json
}

// ---------- zone content ----------
const NEWS_TEMPLATE = `<div class="gr-news"><div class="gr-bg" style="background-image:url('[bilde]')"></div><div class="gr-body"><p class="gr-kicker">Gange-Rolv</p><h1 class="gr-title">[tittel]</h1><div class="gr-text">[tekst]</div></div></div>`

const NEWS_STYLES = `
.gr-news{position:relative;width:1340px;height:860px;overflow:hidden;background:linear-gradient(135deg,#0a0a0a,#161616);font-family:Arial,Helvetica,sans-serif;color:#fff;}
.gr-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.22;}
.gr-body{position:relative;padding:80px;box-sizing:border-box;}
.gr-kicker{color:#16a34a;font-weight:bold;letter-spacing:4px;font-size:26px;margin:0 0 24px;text-transform:uppercase;}
.gr-title{font-size:84px;font-weight:900;margin:0 0 32px;line-height:1.03;}
.gr-text{font-size:36px;line-height:1.5;color:rgba(255,255,255,.85);max-width:1180px;white-space:pre-line;}
`.trim()

const NO_DATA = `<div style="display:flex;align-items:center;justify-content:center;width:1340px;height:860px;background:linear-gradient(135deg,#0a0a0a,#161616);color:rgba(255,255,255,.4);font-family:Arial;font-size:34px;">Ingen publiserte nyheter</div>`

const CLOCK_FORMAT = `<div style="font-family:Arial,Helvetica,sans-serif;text-align:center;color:#fff;line-height:1;"><div style="font-size:104px;font-weight:900;letter-spacing:-2px;">[HH:mm]</div><div style="font-size:30px;color:rgba(255,255,255,.6);margin-top:14px;text-transform:capitalize;">[dddd D. MMMM]</div></div>`

const TICKER_HTML = `<div style="font-family:Arial,Helvetica,sans-serif;color:#fff;font-size:34px;font-weight:600;padding:35px 40px;background:#16a34a;width:1840px;height:120px;box-sizing:border-box;white-space:nowrap;overflow:hidden;">${TICKER_TEXT}</div>`

const WEATHER_URI = `${APP_URL}/widget/vaer?lat=${WEATHER.lat}&lon=${WEATHER.lon}&navn=${encodeURIComponent(WEATHER.navn)}`

// ---------- build ----------
async function getDraftId() {
  // Already checked out? Find the existing draft.
  const existing = await api(`/layout?parentId=${LAYOUT_ID}&embed=regions`)
  if (Array.isArray(existing) && existing[0]) return existing[0].layoutId
  await api(`/layout/checkout/${LAYOUT_ID}`, { method: "PUT" })
  const drafts = await api(`/layout?parentId=${LAYOUT_ID}&embed=regions`)
  if (!drafts[0]) throw new Error("Fant ikke draft etter checkout")
  return drafts[0].layoutId
}

async function addRegion(draftId, { width, height, top, left }) {
  const r = await api(`/region/${draftId}`, { method: "POST", form: { type: "frame", width, height, top, left } })
  return r.regionPlaylist.playlistId
}

async function main() {
  TOKEN = await getToken()
  console.log(`→ Bygger base-mal (layout ${LAYOUT_ID}) mot ${BASE}`)

  const draftId = await getDraftId()
  console.log(`  draft = ${draftId}`)

  // Wipe existing regions for a deterministic rebuild.
  const draft = (await api(`/layout?layoutId=${draftId}&embed=regions,playlists`))[0]
  for (const r of draft.regions || []) {
    await api(`/region/${r.regionId}`, { method: "DELETE" })
  }
  console.log(`  slettet ${(draft.regions || []).length} gamle regioner`)

  // 1. News — DataSet View, rotates through DataSet 1, one item per page.
  const newsPl = await addRegion(draftId, { width: 1340, height: 860, top: 40, left: 40 })
  const newsWidget = await api(`/playlist/widget/dataset/${newsPl}`, {
    method: "POST",
    form: { dataSetId: NEWS_DATASET_ID, templateId: "dataset_custom_html" },
  })
  await api(`/playlist/widget/${newsWidget.widgetId}`, {
    method: "PUT",
    form: {
      dataSetId: NEWS_DATASET_ID,
      templateId: "dataset_custom_html",
      duration: PER_ITEM_SECONDS,
      useDuration: 1,
      durationIsPerItem: 1,
      itemsPerPage: 1,
      numItems: MAX_NEWS_ITEMS,
      lowerLimit: 0,
      upperLimit: 0,
      effect: "fade",
      speed: 1000,
      template: NEWS_TEMPLATE,
      styleSheet: NEWS_STYLES,
      noDataMessage: NO_DATA,
    },
  })
  console.log("  ✓ nyhets-sone (DataSet View)")

  // 2. Digital clock + date (small, top-right).
  const clockPl = await addRegion(draftId, { width: 480, height: 230, top: 40, left: 1400 })
  const clockWidget = await api(`/playlist/widget/clock-digital/${clockPl}`, { method: "POST" })
  await api(`/playlist/widget/${clockWidget.widgetId}`, {
    method: "PUT",
    form: { format: CLOCK_FORMAT, lang: "nb", duration: 60, useDuration: 1 },
  })
  console.log("  ✓ digital klokke + dato")

  // 3. Yr weather (webpage embedding the app widget).
  const weatherPl = await addRegion(draftId, { width: 480, height: 590, top: 310, left: 1400 })
  const weatherWidget = await api(`/playlist/widget/webpage/${weatherPl}`, { method: "POST" })
  await api(`/playlist/widget/${weatherWidget.widgetId}`, {
    method: "PUT",
    form: { uri: WEATHER_URI, transparency: 1, modeid: "1", duration: 60, useDuration: 1 },
  })
  console.log(`  ✓ vær (${WEATHER_URI})`)

  // 4. Ticker (green, bottom).
  const tickerPl = await addRegion(draftId, { width: 1840, height: 120, top: 920, left: 40 })
  const tickerWidget = await api(`/playlist/widget/text/${tickerPl}`, { method: "POST" })
  await api(`/playlist/widget/${tickerWidget.widgetId}`, {
    method: "PUT",
    form: { text: TICKER_HTML, duration: 60, useDuration: 1 },
  })
  console.log("  ✓ ticker")

  // Publish (campaign 8 preserved).
  await api(`/layout/publish/${LAYOUT_ID}`, { method: "PUT", form: { publishNow: 1 } })
  console.log(`\n✅ Publisert. Forhåndsvis: ${BASE}/campaign/8/preview`)
}

main().catch((e) => {
  console.error("FEIL:", e.message)
  process.exit(1)
})
