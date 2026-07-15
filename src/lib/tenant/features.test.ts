import { describe, expect, test } from "vitest"
import { clampAudience, enabledSurfaces, parseTenantFeatures } from "./features"

describe("parseTenantFeatures", () => {
  test("leser flate-flaggene og ignorerer ukjente nøkler", () => {
    expect(parseTenantFeatures({ hideKundeflate: true, tull: true })).toEqual({ hideKundeflate: true })
    expect(parseTenantFeatures({ hideInternflate: true })).toEqual({ hideInternflate: true })
  })

  test("kun eksplisitt true teller", () => {
    expect(parseTenantFeatures({ hideKundeflate: "ja", hideInternflate: 1 })).toEqual({})
  })
})

describe("enabledSurfaces", () => {
  test("default er begge flater på", () => {
    expect(enabledSurfaces(undefined)).toEqual({ kunde: true, intern: true })
    expect(enabledSurfaces({})).toEqual({ kunde: true, intern: true })
  })

  test("hideKundeflate gir kun intern", () => {
    expect(enabledSurfaces({ hideKundeflate: true })).toEqual({ kunde: false, intern: true })
  })

  test("hideInternflate gir kun kunde", () => {
    expect(enabledSurfaces({ hideInternflate: true })).toEqual({ kunde: true, intern: false })
  })

  test("begge skjult (feilkonfig) faller tilbake til begge på", () => {
    expect(enabledSurfaces({ hideKundeflate: true, hideInternflate: true })).toEqual({ kunde: true, intern: true })
  })
})

describe("clampAudience", () => {
  test("begge flater på: audience beholdes", () => {
    expect(clampAudience({}, "kunde")).toBe("kunde")
    expect(clampAudience({}, "intern")).toBe("intern")
    expect(clampAudience({}, "begge")).toBe("begge")
  })

  test("kun intern: alt klemmes til intern", () => {
    const f = { hideKundeflate: true }
    expect(clampAudience(f, "kunde")).toBe("intern")
    expect(clampAudience(f, "begge")).toBe("intern")
    expect(clampAudience(f, "intern")).toBe("intern")
  })

  test("kun kunde: alt klemmes til kunde", () => {
    const f = { hideInternflate: true }
    expect(clampAudience(f, "intern")).toBe("kunde")
    expect(clampAudience(f, "begge")).toBe("kunde")
    expect(clampAudience(f, "kunde")).toBe("kunde")
  })
})
