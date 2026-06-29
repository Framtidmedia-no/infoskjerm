/**
 * Shared Xibo template builder for the Gange-Rolv signage layouts.
 *
 * Both the base template (campaign 8, all-stores fallback) and the 16 per-store
 * layouts are built from the SAME four-zone design here — only the weather
 * coordinates and the news DataSet filter differ.
 *
 *   ┌────────────────────────────┬──────────────┐
 *   │  News (DataSet View 1,     │  Digital     │
 *   │  rotates + autoscroll,     │  clock+date  │
 *   │  filtered per store+date)  ├──────────────┤
 *   │  with date · author byline │  Yr weather  │
 *   ├────────────────────────────┴──────────────┤
 *   │  Ticker (webpage: scroll + red pulse)      │
 *   └────────────────────────────────────────────┘
 *
 * Property names verified live against Xibo 4.4.4.
 */

import { readFileSync } from "node:fs"

export const NEWS_DATASET_ID = 1
export const PER_ITEM_SECONDS = 20
export const PERSIST_SECONDS = 900
export const MAX_NEWS_ITEMS = 50

export function loadEnv() {
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("="))
      .map((l) => {
        const i = l.indexOf("=")
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]
      })
  )
}

export async function getToken(env) {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.XIBO_CLIENT_ID,
    client_secret: env.XIBO_CLIENT_SECRET,
  })
  const r = await fetch(`${env.XIBO_API_URL}/api/authorize/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  if (!r.ok) throw new Error(`token ${r.status}: ${await r.text()}`)
  return (await r.json()).access_token
}

/** Returns an `api(path, opts)` bound to the base URL + token. */
export function makeApi(env, token) {
  return async function api(path, opts = {}) {
    const r = await fetch(`${env.XIBO_API_URL}/api${path}`, {
      method: opts.method || "GET",
      headers: {
        Authorization: `Bearer ${token}`,
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
}

// ---------- zone content ----------
const NEWS_TEMPLATE = `<div class="gr-news"><div class="gr-bg" style="background-image:url('[bilde]')"></div><div class="gr-body"><p class="gr-kicker">Gange-Rolv</p><h1 class="gr-title">[tittel]</h1><p class="gr-byline">[dato] · [forfatter]</p><div class="gr-textwrap"><div class="gr-text">[tekst]</div></div></div></div>`

const NEWS_STYLES = `
.gr-news{position:relative;width:1340px;height:860px;overflow:hidden;background:linear-gradient(135deg,#0a0a0a,#161616);font-family:Arial,Helvetica,sans-serif;color:#fff;}
.gr-bg{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.22;}
.gr-body{position:absolute;inset:0;padding:70px;box-sizing:border-box;display:flex;flex-direction:column;}
.gr-kicker{color:#16a34a;font-weight:bold;letter-spacing:4px;font-size:26px;margin:0 0 20px;text-transform:uppercase;flex:0 0 auto;}
.gr-title{font-size:78px;font-weight:900;margin:0 0 16px;line-height:1.03;flex:0 0 auto;}
.gr-byline{font-size:24px;color:rgba(255,255,255,.5);margin:0 0 28px;flex:0 0 auto;}
.gr-textwrap{position:relative;flex:1 1 auto;overflow:hidden;}
.gr-text{font-size:36px;line-height:1.5;color:rgba(255,255,255,.88);white-space:pre-line;}
`.trim()

const NEWS_JS = `(function(){function go(){var ws=document.querySelectorAll('.gr-textwrap');if(!ws.length){return setTimeout(go,300);}var st=document.createElement('style');document.head.appendChild(st);ws.forEach(function(w,i){var tx=w.querySelector('.gr-text');if(!tx)return;var over=tx.scrollHeight-w.clientHeight;if(over>8){var n='grsc'+i;var dur=Math.max(10,Math.round(over/35)+6);try{st.sheet.insertRule('@keyframes '+n+'{0%,12%{transform:translateY(0)}88%,100%{transform:translateY(-'+over+'px)}}',0);tx.style.animation=n+' '+dur+'s ease-in-out infinite alternate';}catch(e){}}});}go();})();`

const NO_DATA = `<div style="display:flex;align-items:center;justify-content:center;width:1340px;height:860px;background:linear-gradient(135deg,#0a0a0a,#161616);color:rgba(255,255,255,.4);font-family:Arial;font-size:34px;">Ingen publiserte nyheter</div>`

const CLOCK_FORMAT = `<div style="font-family:Arial,Helvetica,sans-serif;text-align:center;color:#fff;line-height:1;"><div style="font-size:104px;font-weight:900;letter-spacing:-2px;">[HH:mm]</div><div style="font-size:30px;color:rgba(255,255,255,.6);margin-top:14px;text-transform:capitalize;">[dddd D. MMMM]</div></div>`

/** Date-window clause shared by all layouts (sentinel-bounded, so no NULL handling). */
export const DATE_WINDOW = "(`fra` <= NOW() AND `til` >= NOW())"

/** Builds the per-store news filter: targeting + date window. */
export function storeNewsFilter(storeName) {
  const safe = storeName.replace(/'/g, "''")
  return `((\`butikker\` = 'ALLE' OR \`butikker\` LIKE '%${safe}%') AND ${DATE_WINDOW})`
}

export function weatherUri(appUrl, { lat, lon, navn }) {
  return `${appUrl}/widget/vaer?lat=${lat}&lon=${lon}&navn=${encodeURIComponent(navn)}`
}
export function tickerUri(appUrl, text) {
  return `${appUrl}/widget/ticker?text=${encodeURIComponent(text)}`
}

async function addRegion(api, draftId, { width, height, top, left }) {
  const r = await api(`/region/${draftId}`, { method: "POST", form: { type: "frame", width, height, top, left } })
  return r.regionPlaylist.playlistId
}

async function getDraftId(api, layoutId) {
  const existing = await api(`/layout?parentId=${layoutId}&embed=regions`)
  if (Array.isArray(existing) && existing[0]) return existing[0].layoutId
  await api(`/layout/checkout/${layoutId}`, { method: "PUT" })
  const drafts = await api(`/layout?parentId=${layoutId}&embed=regions`)
  if (!drafts[0]) throw new Error("Fant ikke draft etter checkout")
  return drafts[0].layoutId
}

/**
 * (Re)builds the four-zone signage layout on the given published layout id.
 * Idempotent: checks out, wipes regions, rebuilds, publishes.
 *
 * opts: { weatherUri, tickerUri, newsFilter }
 */
export async function buildLayout(api, layoutId, opts) {
  const draftId = await getDraftId(api, layoutId)
  const draft = (await api(`/layout?layoutId=${draftId}&embed=regions,playlists`))[0]
  for (const r of draft.regions || []) {
    await api(`/region/${r.regionId}`, { method: "DELETE" })
  }

  // 1. News — DataSet View, rotating + autoscroll + filtered.
  const newsPl = await addRegion(api, draftId, { width: 1340, height: 860, top: 40, left: 40 })
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
      useFilteringClause: 1,
      filter: opts.newsFilter,
      effect: "fade",
      speed: 1000,
      template: NEWS_TEMPLATE,
      styleSheet: NEWS_STYLES,
      javaScript: NEWS_JS,
      noDataMessage: NO_DATA,
    },
  })

  // 2. Digital clock + date.
  const clockPl = await addRegion(api, draftId, { width: 480, height: 230, top: 40, left: 1400 })
  const clockWidget = await api(`/playlist/widget/clock-digital/${clockPl}`, { method: "POST" })
  await api(`/playlist/widget/${clockWidget.widgetId}`, {
    method: "PUT",
    form: { format: CLOCK_FORMAT, lang: "nb", duration: PERSIST_SECONDS, useDuration: 1 },
  })

  // 3. Yr weather (webpage).
  const weatherPl = await addRegion(api, draftId, { width: 480, height: 590, top: 310, left: 1400 })
  const weatherWidget = await api(`/playlist/widget/webpage/${weatherPl}`, { method: "POST" })
  await api(`/playlist/widget/${weatherWidget.widgetId}`, {
    method: "PUT",
    form: { uri: opts.weatherUri, transparency: 1, modeid: "1", isPreNavigate: 1, duration: PERSIST_SECONDS, useDuration: 1 },
  })

  // 4. Ticker (webpage: scroll + pulse).
  const tickerPl = await addRegion(api, draftId, { width: 1840, height: 120, top: 920, left: 40 })
  const tickerWidget = await api(`/playlist/widget/webpage/${tickerPl}`, { method: "POST" })
  await api(`/playlist/widget/${tickerWidget.widgetId}`, {
    method: "PUT",
    form: { uri: opts.tickerUri, transparency: 0, modeid: "1", isPreNavigate: 1, duration: PERSIST_SECONDS, useDuration: 1 },
  })

  await api(`/layout/publish/${layoutId}`, { method: "PUT", form: { publishNow: 1 } })
}
