import { describe, expect, it } from "vitest"
import { activeSeason, parseSeasonKey } from "./season"

describe("activeSeason", () => {
  it("jul i desember", () => {
    expect(activeSeason(new Date("2026-12-15"))?.key).toBe("jul")
  })
  it("jul håndterer årsskiftet (1. januar)", () => {
    expect(activeSeason(new Date("2027-01-01"))?.key).toBe("jul")
  })
  it("ingen sesong 2. januar", () => {
    expect(activeSeason(new Date("2027-01-02"))).toBeNull()
  })
  it("syttendemai 16. mai", () => {
    expect(activeSeason(new Date("2026-05-16"))?.key).toBe("syttendemai")
  })
  it("sommer i juli, med varm tint", () => {
    const s = activeSeason(new Date("2026-07-02"))
    expect(s?.key).toBe("sommer")
    expect(s?.tint).toBeTruthy()
  })
  it("ingen sesong i mars", () => {
    expect(activeSeason(new Date("2026-03-01"))).toBeNull()
  })
})

describe("parseSeasonKey", () => {
  it("gyldig nøkkel gir sesong med tint", () => {
    expect(parseSeasonKey("jul")?.key).toBe("jul")
  })
  it("ukjent nøkkel gir null", () => {
    expect(parseSeasonKey("halloween")).toBeNull()
    expect(parseSeasonKey(undefined)).toBeNull()
  })
})
