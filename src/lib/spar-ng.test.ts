import { describe, expect, it } from "vitest"
import { ngHitToProduct } from "./spar-ng"

// Feltverdier fra ekte episearch-svar (spar.no kjede 1210), 2026-07-03.
const BANAN = {
  ean: "2000401100000",
  title: "Bananer",
  subtitle: "Kg",
  pricePerUnit: 5.98,
  comparePricePerUnit: 29.9,
  compareUnit: "kg",
  recycleValue: 0,
  imagePath: "4011/kmh",
}

describe("ngHitToProduct", () => {
  it("mapper banan-treffet til tilbudskort-felter", () => {
    const p = ngHitToProduct("2000401100000", BANAN)
    expect(p).toEqual({
      gtin: "2000401100000",
      varenavn: "Bananer",
      vareinfo: "Kg",
      pris: "5,98",
      enhetspris: "kr 29,90/kg",
      pant: false,
      imageUrl: "https://bilder.ngdata.no/4011/kmh/large.jpg",
    })
  })

  it("setter pant når recycleValue > 0", () => {
    const p = ngHitToProduct("54492653", { ean: "54492653", title: "Powerade Sport", recycleValue: 2 })
    expect(p?.pant).toBe(true)
  })

  it("avviser treff der ean ikke matcher (fuzzy-søk)", () => {
    expect(ngHitToProduct("2000401100000", { ...BANAN, ean: "9999999999999" })).toBeNull()
    expect(ngHitToProduct("2000401100000", undefined)).toBeNull()
  })

  it("faller tilbake til GTIN-bilde uten imagePath og tåler manglende felter", () => {
    const p = ngHitToProduct("2371564300003", { ean: "2371564300003", title: "Sommerkoteletter" })
    expect(p).toEqual({
      gtin: "2371564300003",
      varenavn: "Sommerkoteletter",
      vareinfo: null,
      pris: null,
      enhetspris: null,
      pant: false,
      imageUrl: "https://bilder.ngdata.no/2371564300003/kmh/large.jpg",
    })
  })

  it("enhetspris krever både tall og enhet", () => {
    const p = ngHitToProduct("2000459500005", { ean: "2000459500005", title: "Agurk", pricePerUnit: 26.9, comparePricePerUnit: 26.9, compareUnit: "" })
    expect(p?.enhetspris).toBeNull()
    expect(p?.pris).toBe("26,90")
  })
})
