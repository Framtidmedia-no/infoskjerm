import { describe, it, expect } from "vitest"
import { buildIcs, icsEscape, icsFilename } from "./ics"

describe("buildIcs", () => {
  it("lager tidsatt hendelse med 2 timers varighet i lokal flytende tid", () => {
    const ics = buildIcs({ uid: "abc-123", title: "Sommerfest", dateIso: "2026-08-14T18:30", place: "Kantina" })
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("UID:abc-123@infoskjerm.framtidtech.no")
    expect(ics).toContain("DTSTART:20260814T183000")
    expect(ics).toContain("DTEND:20260814T203000")
    expect(ics).toContain("SUMMARY:Sommerfest")
    expect(ics).toContain("LOCATION:Kantina")
  })

  it("lager heldagshendelse uten klokkeslett (DTEND = dagen etter)", () => {
    const ics = buildIcs({ uid: "u1", title: "Julebord", dateIso: "2026-12-11", place: null })
    expect(ics).toContain("DTSTART;VALUE=DATE:20261211")
    expect(ics).toContain("DTEND;VALUE=DATE:20261212")
    expect(ics).not.toContain("LOCATION")
  })

  it("håndterer varighet over midnatt", () => {
    const ics = buildIcs({ uid: "u2", title: "Kveldsfest", dateIso: "2026-08-14T23:30", place: null })
    expect(ics).toContain("DTSTART:20260814T233000")
    expect(ics).toContain("DTEND:20260815T013000")
  })

  it("returnerer null for ugyldig dato", () => {
    expect(buildIcs({ uid: "u3", title: "X", dateIso: "ikke-en-dato", place: null })).toBeNull()
  })

  it("escaper spesialtegn i tekstfelt", () => {
    expect(icsEscape("Fest; mat, drikke\nog moro")).toBe("Fest\\; mat\\, drikke\\nog moro")
    const ics = buildIcs({ uid: "u4", title: "A;B,C", dateIso: "2026-08-14", place: null })
    expect(ics).toContain("SUMMARY:A\\;B\\,C")
  })
})

describe("icsFilename", () => {
  it("lager trygt filnavn av tittel", () => {
    expect(icsFilename("Sommerfest på Moa 2026!")).toBe("sommerfest-på-moa-2026.ics")
    expect(icsFilename("???")).toBe("arrangement.ics")
  })
})
