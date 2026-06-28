import { xiboFetch } from "./client"

/**
 * Pushes authored content into Xibo as a published layout.
 *
 * Proven Xibo 4.4 recipe (see memory xibo-server):
 *  1. POST /layout            → published parent (auto-creates a draft child)
 *  2. GET  /layout?parentId   → find the editable draft layoutId
 *  3. POST /region/{draft}    → region + regionPlaylist.playlistId
 *  4. POST /playlist/widget/text/{playlist} → widgetId
 *  5. PUT  /playlist/widget/{widgetId}      → set HTML text
 *  6. PUT  /layout/publish/{parent}         → publish
 */

const RESOLUTION_1080P = 1
const DEFAULT_DURATION = 15

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Full-screen styled HTML for a single content item (title + body + image). */
export function buildContentHtml(title: string, bodyHtml: string, imageUrl: string | null): string {
  const image = imageUrl
    ? `<div style="position:absolute;inset:0;background:url('${imageUrl}') center/cover;opacity:0.25;"></div>`
    : ""
  return `<!doctype html><html><body style="margin:0;">
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:linear-gradient(135deg,#0a0a0a,#161616);color:#fff;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;">
${image}
<div style="position:relative;padding:80px;">
<p style="color:#16a34a;font-weight:bold;letter-spacing:4px;font-size:26px;margin:0 0 24px;">INTERN NYHET</p>
<h1 style="font-size:84px;font-weight:900;margin:0 0 36px;line-height:1.02;">${esc(title)}</h1>
<div style="font-size:36px;line-height:1.5;color:rgba(255,255,255,0.85);max-width:1500px;">${bodyHtml}</div>
</div></div></body></html>`
}

export interface XiboLayoutRef {
  layoutId: number
  campaignId: number | null
}

interface CreatedLayout { layoutId: number }
interface DraftLayout { layoutId: number }
interface RegionResult { regionPlaylist: { playlistId: number } }
interface WidgetResult { widgetId: number }
interface LayoutWithCampaign { layoutId: number; campaignId?: number }

/** Creates a published Xibo layout rendering the given HTML. Returns layout + campaign id. */
export async function createXiboLayout(name: string, html: string): Promise<XiboLayoutRef> {
  const created = await xiboFetch<CreatedLayout>("/layout", {
    method: "POST",
    form: { name: name.slice(0, 50), resolutionId: RESOLUTION_1080P },
  })
  const parentId = created.layoutId

  const drafts = await xiboFetch<DraftLayout[]>("/layout", {
    query: { parentId, embed: "regions,playlists" },
  })
  const draftId = drafts[0]?.layoutId
  if (!draftId) throw new Error("Fant ikke draft-layout etter opprettelse")

  const region = await xiboFetch<RegionResult>(`/region/${draftId}`, {
    method: "POST",
    form: { type: "frame", width: 1920, height: 1080, top: 0, left: 0 },
  })
  const playlistId = region.regionPlaylist.playlistId

  const widget = await xiboFetch<WidgetResult>(`/playlist/widget/text/${playlistId}`, { method: "POST" })
  await xiboFetch(`/playlist/widget/${widget.widgetId}`, {
    method: "PUT",
    form: { text: html, duration: DEFAULT_DURATION, useDuration: 1 },
  })

  await xiboFetch(`/layout/publish/${parentId}`, { method: "PUT", form: { publishNow: 1 } })

  // Resolve campaign id for preview/scheduling (best-effort).
  let campaignId: number | null = null
  try {
    const campaigns = await xiboFetch<{ campaignId: number }[]>("/campaign", { query: { layoutId: parentId } })
    campaignId = campaigns[0]?.campaignId ?? null
  } catch {
    const layouts = await xiboFetch<LayoutWithCampaign[]>("/layout", { query: { layoutId: parentId } })
    campaignId = layouts[0]?.campaignId ?? null
  }

  return { layoutId: parentId, campaignId }
}

export async function deleteXiboLayout(layoutId: number): Promise<void> {
  await xiboFetch(`/layout/${layoutId}`, { method: "DELETE" }).catch(() => {})
}
