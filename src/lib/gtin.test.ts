import { describe, expect, it } from "vitest"
import { catalogGtinFrom23, ean13CheckDigit, expandPluToGtin, normalizeGtinInput } from "./gtin"

describe("ean13CheckDigit", () => {
  it("banan-basen gir kontrollsiffer 0", () => {
    expect(ean13CheckDigit("200040110000")).toBe("0")
  })
  it("agurk-basen gir kontrollsiffer 5", () => {
    expect(ean13CheckDigit("200045950000")).toBe("5")
  })
  it("kjent EAN-13 (Coca-Cola 5449000000996)", () => {
    expect(ean13CheckDigit("544900000099")).toBe("6")
  })
})

describe("expandPluToGtin", () => {
  it("4-sifret PLU: banan 4011 → 2000401100000", () => {
    expect(expandPluToGtin("4011")).toBe("2000401100000")
  })
  it("4-sifret PLU: agurk 4595 → 2000459500005", () => {
    expect(expandPluToGtin("4595")).toBe("2000459500005")
  })
  it("5-sifret PLU: 44011 → 200 + PLU + nuller + kontrollsiffer", () => {
    // Base 200440110000: 2+0+0+0+4*1... vekter 1/3 vekselvis → sum 22, kontrollsiffer 8
    expect(expandPluToGtin("44011")).toBe("2004401100008")
  })
  it("5-sifret økologisk PLU (9-prefiks): 94011", () => {
    // Base 200940110000: sum 37 → kontrollsiffer 3
    expect(expandPluToGtin("94011")).toBe("2009401100003")
  })
})

describe("catalogGtinFrom23", () => {
  it("katalogform er stabil (allerede nullstilt kode beholdes)", () => {
    expect(catalogGtinFrom23("2371564300003")).toBe("2371564300003")
  })
  it("nullstiller vekt/pris-sifre fra vekta", () => {
    expect(catalogGtinFrom23("2371564312349")).toBe("2371564300003")
  })
  it("godtar bare de 8 identifiserende sifrene", () => {
    expect(catalogGtinFrom23("23715643")).toBe("2371564300003")
  })
})

describe("normalizeGtinInput", () => {
  it("nullstiller 23-koder til katalogform", () => {
    expect(normalizeGtinInput("2371564312349")).toBe("2371564300003")
    expect(normalizeGtinInput("23715643")).toBe("2371564300003")
  })
  it("rører ikke korte tall som starter på 23 (6–7 siffer er vanlig GTIN)", () => {
    expect(normalizeGtinInput("234567")).toBe("234567")
  })
  it("utvider 4-sifret PLU", () => {
    expect(normalizeGtinInput("4011")).toBe("2000401100000")
  })
  it("utvider 5-sifret PLU", () => {
    expect(normalizeGtinInput("44011")).toBe("2004401100008")
  })
  it("tåler mellomrom rundt PLU", () => {
    expect(normalizeGtinInput(" 4595 ")).toBe("2000459500005")
  })
  it("lar fulle GTIN-er (6+ siffer) passere urørt", () => {
    expect(normalizeGtinInput("54492653")).toBe("54492653")
    expect(normalizeGtinInput("7038010013966")).toBe("7038010013966")
  })
  it("avviser ikke-numerisk og for korte input", () => {
    expect(normalizeGtinInput("banan")).toBeNull()
    expect(normalizeGtinInput("401")).toBeNull()
    expect(normalizeGtinInput("")).toBeNull()
  })
})
