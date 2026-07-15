import { describe, it, expect } from "vitest"
import { buildRealCards, buildDemoCards, DEMO_STORE_NAME } from "./build-cards"
import type { FleetScreen, FleetStore } from "./types"

function screen(over: Partial<FleetScreen> = {}): FleetScreen {
  return {
    displayId: 1,
    name: "Skjerm 1",
    online: true,
    lastSeen: null,
    sync: "ok",
    currentLayout: null,
    clientVersion: null,
    displayGroupId: 10,
    flate: "kunde",
    avdeling: "felles",
    avdelingLabel: "Hele butikken",
    orientation: "portrait",
    widgetSrc: "/widget/tilbud?store=s1",
    content: [],
    ...over,
  }
}

function store(screens: FleetScreen[]): FleetStore {
  return { id: "s1", name: "Eurospar Moa", city: "Ålesund", lat: null, lon: null, screens, liveCount: 3 }
}

describe("buildRealCards", () => {
  it("padder ALDRI ekte skjermer med demo-kort — 1 skjerm gir 1 kort", () => {
    const cards = buildRealCards(store([screen()]), "alle")
    expect(cards).toHaveLength(1)
    expect(cards.every((c) => c.live)).toBe(true)
  })

  it("gir tom liste (ikke demo) når butikken ikke har skjermer", () => {
    expect(buildRealCards(store([]), "alle")).toHaveLength(0)
  })

  it("filtrerer på flate — kunde-fanen viser kun kundeskjermer", () => {
    const s = store([screen({ displayId: 1, flate: "kunde" }), screen({ displayId: 2, flate: "intern" })])
    const kunde = buildRealCards(s, "kunde")
    expect(kunde).toHaveLength(1)
    expect(kunde[0].screen?.flate).toBe("kunde")
    const intern = buildRealCards(s, "internt")
    expect(intern).toHaveLength(1)
    expect(intern[0].screen?.flate).toBe("intern")
  })

  it("bruker skjermens ekte navn og status i pillen", () => {
    const cards = buildRealCards(store([screen({ name: "Kasse 2", online: false })]), "alle")
    expect(cards[0].pill).toMatchObject({ label: "Kasse 2", state: false })
  })
})

describe("buildDemoCards", () => {
  it("bruker ALDRI et ekte butikknavn — alt fabrikkert innhold hører til eksempelbutikken", () => {
    const cards = buildDemoCards("Hele butikken")
    expect(cards.length).toBeGreaterThan(0)
    for (const c of cards) {
      expect(c.store).toBe(DEMO_STORE_NAME)
      expect(c.pill.label).toBe(DEMO_STORE_NAME)
      expect(c.live).toBe(false)
      expect(c.pill.state).toBeNull()
      expect(c.contentKind).toBe("demo")
    }
  })

  it("viser hver demo-variant kun én gang (ingen duplikater for å fylle ut)", () => {
    const variants = buildDemoCards("Hele butikken").map((c) => c.demo)
    expect(new Set(variants).size).toBe(variants.length)
  })
})
