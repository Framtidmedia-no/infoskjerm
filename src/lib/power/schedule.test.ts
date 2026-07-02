import { describe, it, expect } from "vitest"
import {
  resolveDesiredPower,
  hasConfiguredHours,
  parseHm,
  formatHm,
  osloClock,
  type OpeningHours,
} from "./schedule"

// Hverdager 07–23, lørdag 08–21, søndag stengt — typisk dagligvare.
const HOURS: OpeningHours = {
  mon: { opens: "07:00", closes: "23:00" },
  tue: { opens: "07:00", closes: "23:00" },
  wed: { opens: "07:00", closes: "23:00" },
  thu: { opens: "07:00", closes: "23:00" },
  fri: { opens: "07:00", closes: "23:00" },
  sat: { opens: "08:00", closes: "21:00" },
  sun: null,
}

/** Bygger et Date som er `hh:mm` Oslo-tid på gitt ISO-dato (sommertid i juli = UTC+2). */
function osloDate(isoDay: string, hm: string): Date {
  return new Date(`${isoDay}T${hm}:00+02:00`)
}

describe("parseHm/formatHm", () => {
  it("parser og formaterer HH:MM", () => {
    expect(parseHm("07:00")).toBe(420)
    expect(parseHm("23:59")).toBe(1439)
    expect(parseHm("7:30")).toBe(450)
    expect(formatHm(420)).toBe("07:00")
    expect(formatHm(1439)).toBe("23:59")
  })

  it("avviser ugyldige verdier", () => {
    expect(parseHm("24:00")).toBeNull()
    expect(parseHm("12:60")).toBeNull()
    expect(parseHm("abc")).toBeNull()
    expect(parseHm("")).toBeNull()
  })
})

describe("osloClock", () => {
  it("gir riktig ukedag og klokkeslett i Oslo", () => {
    // Onsdag 1. juli 2026 kl 14:30 Oslo (sommertid).
    const { day, minutes } = osloClock(new Date("2026-07-01T12:30:00Z"))
    expect(day).toBe(2) // ons
    expect(minutes).toBe(14 * 60 + 30)
  })

  it("håndterer midnatt", () => {
    const { minutes } = osloClock(new Date("2026-07-01T22:00:00Z")) // 00:00 Oslo 2. juli
    expect(minutes).toBe(0)
  })
})

describe("hasConfiguredHours", () => {
  it("false for null/tom/alle stengt", () => {
    expect(hasConfiguredHours(null)).toBe(false)
    expect(hasConfiguredHours(undefined)).toBe(false)
    expect(hasConfiguredHours({})).toBe(false)
    expect(hasConfiguredHours({ mon: null, sun: null })).toBe(false)
  })

  it("true når minst én dag har gyldige tider", () => {
    expect(hasConfiguredHours({ mon: { opens: "07:00", closes: "23:00" } })).toBe(true)
  })
})

describe("resolveDesiredPower — schedule", () => {
  const base = { hours: HOURS, mode: "auto" as const, leadMin: 15, lagMin: 15 }

  it("på midt i åpningstiden", () => {
    const d = resolveDesiredPower({ ...base, now: osloDate("2026-07-01", "12:00") })
    expect(d.desired).toBe("on")
    expect(d.reason).toBe("schedule")
  })

  it("på i lead-vinduet før åpning (06:50 med 15 min lead)", () => {
    const d = resolveDesiredPower({ ...base, now: osloDate("2026-07-01", "06:50") })
    expect(d.desired).toBe("on")
  })

  it("av før lead-vinduet (06:30)", () => {
    const d = resolveDesiredPower({ ...base, now: osloDate("2026-07-01", "06:30") })
    expect(d.desired).toBe("off")
    // Neste overgang = 06:45 (07:00 − 15 min).
    expect(d.nextTransition).toEqual(osloDate("2026-07-01", "06:45"))
  })

  it("på i lag-vinduet etter stenging (23:10 med 15 min lag)", () => {
    const d = resolveDesiredPower({ ...base, now: osloDate("2026-07-01", "23:10") })
    expect(d.desired).toBe("on")
    expect(d.nextTransition).toEqual(osloDate("2026-07-01", "23:15"))
  })

  it("av etter lag-vinduet (23:30)", () => {
    const d = resolveDesiredPower({ ...base, now: osloDate("2026-07-01", "23:30") })
    expect(d.desired).toBe("off")
  })

  it("av hele stengte dagen (søndag), neste overgang mandag morgen", () => {
    // Søndag 5. juli 2026 kl 12:00.
    const d = resolveDesiredPower({ ...base, now: osloDate("2026-07-05", "12:00") })
    expect(d.desired).toBe("off")
    expect(d.nextTransition).toEqual(osloDate("2026-07-06", "06:45"))
  })

  it("vindu som krysser midnatt (20:00–02:00) er på kl 01:00 natt etter", () => {
    const late: OpeningHours = { fri: { opens: "20:00", closes: "02:00" } }
    // Lørdag 4. juli kl 01:00 — fredagsvinduet lever fortsatt.
    const d = resolveDesiredPower({ hours: late, mode: "auto", leadMin: 0, lagMin: 0, now: osloDate("2026-07-04", "01:00") })
    expect(d.desired).toBe("on")
    expect(d.nextTransition).toEqual(osloDate("2026-07-04", "02:00"))
  })
})

describe("resolveDesiredPower — moduser og override", () => {
  const base = { hours: HOURS, mode: "auto" as const, leadMin: 15, lagMin: 15 }

  it("always_on er alltid på — også søndag", () => {
    const d = resolveDesiredPower({ ...base, mode: "always_on", now: osloDate("2026-07-05", "12:00") })
    expect(d.desired).toBe("on")
    expect(d.reason).toBe("always_on")
  })

  it("aktiv override vinner over plan", () => {
    const d = resolveDesiredPower({
      ...base,
      override: "on",
      overrideUntil: osloDate("2026-07-05", "14:00"),
      now: osloDate("2026-07-05", "12:00"), // stengt søndag
    })
    expect(d.desired).toBe("on")
    expect(d.reason).toBe("override")
  })

  it("utløpt override ignoreres", () => {
    const d = resolveDesiredPower({
      ...base,
      override: "on",
      overrideUntil: osloDate("2026-07-05", "11:00"),
      now: osloDate("2026-07-05", "12:00"),
    })
    expect(d.desired).toBe("off")
    expect(d.reason).toBe("schedule")
  })

  it("override av midt på dagen", () => {
    const d = resolveDesiredPower({
      ...base,
      override: "off",
      overrideUntil: osloDate("2026-07-01", "23:15"),
      now: osloDate("2026-07-01", "12:00"),
    })
    expect(d.desired).toBe("off")
    expect(d.reason).toBe("override")
  })
})

describe("resolveDesiredPower — trygge defaults", () => {
  it("ingen åpningstider konfigurert → alltid på", () => {
    const d = resolveDesiredPower({ hours: null, mode: "auto", leadMin: 15, lagMin: 15, now: osloDate("2026-07-05", "03:00") })
    expect(d.desired).toBe("on")
    expect(d.reason).toBe("no_hours")
    expect(d.nextTransition).toBeNull()
  })

  it("ugyldige tidsverdier behandles som ukonfigurert dag", () => {
    const broken: OpeningHours = { mon: { opens: "99:00", closes: "23:00" } }
    const d = resolveDesiredPower({ hours: broken, mode: "auto", leadMin: 0, lagMin: 0, now: osloDate("2026-07-06", "12:00") })
    expect(d.desired).toBe("on")
    expect(d.reason).toBe("no_hours")
  })
})
