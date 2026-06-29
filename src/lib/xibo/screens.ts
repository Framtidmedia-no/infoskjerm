import { xiboFetch } from "./client"

/**
 * Real screens per store, read live from the screen engine (Xibo). A store's
 * customer screens are the displays assigned to its display group (the group
 * named exactly after the store). Read-only — CMS users see status here but
 * never log into Xibo. Returns an empty map if the engine is unreachable, so an
 * admin page never crashes on a screen-engine hiccup.
 */

export interface StoreScreen {
  displayId: number
  name: string
  online: boolean
  lastSeen: string | null
}

interface XiboDisplay {
  displayId: number
  display: string
  loggedIn: number
  lastAccessed: string | null
}
interface XiboGroup {
  displayGroupId: number
  displayGroup: string
}

/** Xibo lastAccessed may be a unix timestamp (seconds) or an ISO string. */
function parseLastSeen(raw: string | null): string | null {
  if (!raw) return null
  const asNum = Number(raw)
  const d = Number.isFinite(asNum) && asNum > 0 ? new Date(asNum * 1000) : new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })
}

function isOnline(d: XiboDisplay): boolean {
  return d.loggedIn === 1
}

export async function fetchScreensByStore(stores: { id: string; name: string }[]): Promise<Map<string, StoreScreen[]>> {
  const result = new Map<string, StoreScreen[]>()
  if (stores.length === 0) return result

  let groups: XiboGroup[]
  try {
    groups = await xiboFetch<XiboGroup[]>("/displaygroup", { query: { isDisplaySpecific: 0, length: 1000 } })
  } catch {
    return result
  }
  const groupIdByName = new Map((groups ?? []).map((g) => [g.displayGroup, g.displayGroupId]))

  await Promise.all(
    stores.map(async (store) => {
      const gid = groupIdByName.get(store.name)
      if (!gid) {
        result.set(store.id, [])
        return
      }
      try {
        const displays = await xiboFetch<XiboDisplay[]>("/display", { query: { displayGroupId: gid, length: 1000 } })
        result.set(
          store.id,
          (displays ?? [])
            .map((d) => ({ displayId: d.displayId, name: d.display, online: isOnline(d), lastSeen: parseLastSeen(d.lastAccessed) }))
            .sort((a, b) => a.name.localeCompare(b.name, "nb"))
        )
      } catch {
        result.set(store.id, [])
      }
    })
  )
  return result
}
