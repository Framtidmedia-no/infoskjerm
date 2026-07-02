import { describe, it, expect } from "vitest"
import { audienceForType, storedAudienceOf, audienceMatches } from "./audience"

describe("audienceForType", () => {
  it("defaults slide to kunde and everything else to intern", () => {
    expect(audienceForType("slide")).toBe("kunde")
    expect(audienceForType("news")).toBe("intern")
    expect(audienceForType("ticker")).toBe("intern")
  })
})

describe("storedAudienceOf", () => {
  it("returns explicit audience values including begge", () => {
    expect(storedAudienceOf("news", "kunde")).toBe("kunde")
    expect(storedAudienceOf("slide", "intern")).toBe("intern")
    expect(storedAudienceOf("slide", "begge")).toBe("begge")
  })
  it("falls back to the type default for missing/garbage values", () => {
    expect(storedAudienceOf("slide", undefined)).toBe("kunde")
    expect(storedAudienceOf("slide", null)).toBe("kunde")
    expect(storedAudienceOf("news", "banan")).toBe("intern")
  })
})

describe("audienceMatches", () => {
  it("matches same surface only", () => {
    expect(audienceMatches("kunde", "kunde")).toBe(true)
    expect(audienceMatches("intern", "intern")).toBe(true)
    expect(audienceMatches("kunde", "intern")).toBe(false)
    expect(audienceMatches("intern", "kunde")).toBe(false)
  })
  it("matches begge on both surfaces", () => {
    expect(audienceMatches("begge", "kunde")).toBe(true)
    expect(audienceMatches("begge", "intern")).toBe(true)
  })
})
