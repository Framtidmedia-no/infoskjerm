import { describe, it, expect } from "vitest"
import { pickFullscreenVariant, fullscreenItemSeconds, FULLSCREEN_PAGE_SECONDS } from "./fullscreen"

const base = { imageUrl: null as string | null, pages: [] as string[], portraitUrl: null as string | null, portraitPages: [] as string[] }

describe("pickFullscreenVariant", () => {
  it("picks matching orientation when both exist", () => {
    const item = { ...base, imageUrl: "l.jpg", portraitUrl: "p.jpg" }
    expect(pickFullscreenVariant(item, false).url).toBe("l.jpg")
    expect(pickFullscreenVariant(item, true).url).toBe("p.jpg")
  })
  it("falls back to the other variant when one is missing", () => {
    expect(pickFullscreenVariant({ ...base, imageUrl: "l.jpg" }, true).url).toBe("l.jpg")
    expect(pickFullscreenVariant({ ...base, portraitUrl: "p.jpg" }, false).url).toBe("p.jpg")
  })
  it("carries the variant's own pages", () => {
    const item = { ...base, imageUrl: "l.pdf", pages: ["l1.jpg"], portraitUrl: "p.pdf", portraitPages: ["p1.jpg", "p2.jpg"] }
    expect(pickFullscreenVariant(item, true).pages).toEqual(["p1.jpg", "p2.jpg"])
    expect(pickFullscreenVariant(item, false).pages).toEqual(["l1.jpg"])
  })
})

describe("fullscreenItemSeconds", () => {
  it("returns null for non-fullskjerm items", () => {
    expect(fullscreenItemSeconds({ ...base, imageUrl: "x.jpg", imageMode: "plakat", durationSeconds: null }, false, 16)).toBeNull()
  })
  it("multiplies per-page duration for rendered decks", () => {
    const item = { ...base, imageUrl: "x.pdf", pages: ["1", "2", "3"], imageMode: "fullskjerm", durationSeconds: null }
    expect(fullscreenItemSeconds(item, false, 16)).toBe(FULLSCREEN_PAGE_SECONDS * 3)
    expect(fullscreenItemSeconds({ ...item, durationSeconds: 5 }, false, 16)).toBe(15)
  })
  it("uses item duration or fallback for images and unrendered decks", () => {
    const img = { ...base, imageUrl: "x.jpg", imageMode: "fullskjerm", durationSeconds: null }
    expect(fullscreenItemSeconds(img, false, 16)).toBe(16)
    expect(fullscreenItemSeconds({ ...img, durationSeconds: 30 }, false, 16)).toBe(30)
    const pendingDeck = { ...base, imageUrl: "x.pdf", imageMode: "fullskjerm", durationSeconds: null }
    expect(fullscreenItemSeconds(pendingDeck, false, 16)).toBe(16)
  })
  it("counts pages for the variant that will actually show", () => {
    const item = { ...base, imageUrl: "l.pdf", pages: ["1", "2"], portraitUrl: "p.pdf", portraitPages: ["1", "2", "3", "4"], imageMode: "fullskjerm", durationSeconds: null }
    expect(fullscreenItemSeconds(item, true, 16)).toBe(FULLSCREEN_PAGE_SECONDS * 4)
    expect(fullscreenItemSeconds(item, false, 16)).toBe(FULLSCREEN_PAGE_SECONDS * 2)
  })
})
