import { describe, it, expect } from "vitest"
import { offlineFaultsFromDisplays } from "./insight"
import type { XiboDisplay } from "./client"

/** Minimal display factory — only the fields the offline-fault logic reads. */
function display(over: Partial<XiboDisplay>): XiboDisplay {
  return {
    displayId: 1,
    display: "gr-test-1",
    description: null,
    loggedIn: 1,
    lastAccessed: "2026-07-01 22:38:08",
    defaultLayoutId: null,
    ...over,
  }
}

describe("offlineFaultsFromDisplays", () => {
  it("does not fault a display that is logged in", () => {
    expect(offlineFaultsFromDisplays([display({ loggedIn: 1 })])).toEqual([])
  })

  it("faults a display that is not logged in, with its last-seen time", () => {
    const faults = offlineFaultsFromDisplays([
      display({ displayId: 2, display: "gr-eurospar-moa2", loggedIn: 0, lastAccessed: "2026-06-30 16:19:44" }),
    ])
    expect(faults).toHaveLength(1)
    expect(faults[0]).toMatchObject({ displayId: 2, display: "gr-eurospar-moa2", code: "OFFLINE" })
    expect(faults[0].since).toContain("30.6.2026")
  })

  it("marks a display that has never connected", () => {
    const [fault] = offlineFaultsFromDisplays([display({ loggedIn: 0, lastAccessed: null })])
    expect(fault.since).toBe("har aldri koblet til")
  })

  it("orders the most-stale display first", () => {
    const faults = offlineFaultsFromDisplays([
      display({ displayId: 1, display: "recent", loggedIn: 0, lastAccessed: "2026-07-01 22:38:08" }),
      display({ displayId: 2, display: "stale", loggedIn: 0, lastAccessed: "2026-06-30 16:19:44" }),
      display({ displayId: 3, display: "never", loggedIn: 0, lastAccessed: null }),
    ])
    expect(faults.map((f) => f.display)).toEqual(["never", "stale", "recent"])
  })

  it("returns nothing for an empty estate", () => {
    expect(offlineFaultsFromDisplays([])).toEqual([])
  })
})
