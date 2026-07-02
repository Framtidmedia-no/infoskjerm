/**
 * Minimal iCalendar-generering (RFC 5545) for «Legg i kalenderen» på
 * påmeldingssiden. Tidspunkt skrives som lokal «flytende» tid (uten sone) —
 * gjestene er i samme tidssone som butikken. Uten klokkeslett blir det
 * heldagshendelse; med klokkeslett settes varighet 2 timer.
 */

export interface IcsEvent {
  uid: string
  title: string
  dateIso: string
  place: string | null
}

/** Escaper tekst for iCalendar-felt. */
export function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

const pad2 = (n: number) => String(n).padStart(2, "0")

export function buildIcs(event: IcsEvent): string | null {
  const d = new Date(event.dateIso)
  if (Number.isNaN(d.getTime())) return null
  const hasTime = /T\d\d:\d\d/.test(event.dateIso)
  const day = `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`
  let dtStart: string
  let dtEnd: string
  if (hasTime) {
    dtStart = `DTSTART:${day}T${pad2(d.getHours())}${pad2(d.getMinutes())}00`
    const end = new Date(d.getTime() + 2 * 60 * 60 * 1000)
    dtEnd = `DTEND:${end.getFullYear()}${pad2(end.getMonth() + 1)}${pad2(end.getDate())}T${pad2(end.getHours())}${pad2(end.getMinutes())}00`
  } else {
    const next = new Date(d.getTime() + 24 * 60 * 60 * 1000)
    dtStart = `DTSTART;VALUE=DATE:${day}`
    dtEnd = `DTEND;VALUE=DATE:${next.getFullYear()}${pad2(next.getMonth() + 1)}${pad2(next.getDate())}`
  }
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Framtid Tech//Infoskjerm Pamelding//NO",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}@infoskjerm.framtidtech.no`,
    `DTSTAMP:${stamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${icsEscape(event.title)}`,
    ...(event.place ? [`LOCATION:${icsEscape(event.place)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}

/** Filnavn-vennlig slug av arrangementstittelen. */
export function icsFilename(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9æøå]+/gi, "-").replace(/^-+|-+$/g, "")
  return `${slug || "arrangement"}.ics`
}
