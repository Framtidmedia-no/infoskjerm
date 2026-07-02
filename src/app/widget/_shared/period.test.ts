import { describe, expect, it } from "vitest"
import { expiryLabel, formatPeriod } from "./period"

describe("expiryLabel", () => {
  const now = new Date("2026-07-02T10:00:00")
  it("null uten validTo", () => {
    expect(expiryLabel(null, now)).toBeNull()
  })
  it("null når det er mer enn 48 timer igjen", () => {
    expect(expiryLabel("2026-07-10", now)).toBeNull()
  })
  it("null når tilbudet er utløpt", () => {
    expect(expiryLabel("2026-07-01", now)).toBeNull()
  })
  it("«Slutter i dag» samme kalenderdag", () => {
    expect(expiryLabel("2026-07-02", now)).toBe("Slutter i dag")
  })
  it("dato uten klokkeslett gjelder UT dagen (23:59)", () => {
    expect(expiryLabel("2026-07-02", new Date("2026-07-02T23:00:00"))).toBe("Slutter i dag")
  })
  it("«Slutter i morgen» neste kalenderdag", () => {
    expect(expiryLabel("2026-07-03", now)).toBe("Slutter i morgen")
  })
  it("«Slutter snart» to kalenderdager fram men innen 48 t", () => {
    expect(expiryLabel("2026-07-04T08:00:00", now)).toBe("Slutter snart")
  })
  it("null ved ugyldig dato", () => {
    expect(expiryLabel("tull", now)).toBeNull()
  })
})

describe("formatPeriod", () => {
  it("null uten datoer", () => {
    expect(formatPeriod(null, null)).toBeNull()
  })
  it("fra–til", () => {
    expect(formatPeriod("2026-07-01", "2026-07-04")).toBe("Gjelder 1. juli – 4. juli")
  })
  it("kun til", () => {
    expect(formatPeriod(null, "2026-07-04")).toBe("Gjelder til 4. juli")
  })
})
