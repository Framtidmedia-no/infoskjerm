/**
 * Delt periode-logikk for skjermkortene. `formatPeriod` er flyttet hit fra
 * rotatorene (identisk oppførsel). `expiryLabel` gir «Slutter snart»-status:
 * satt når validTo er innen 48 timer — en ren dato (uten klokkeslett) regnes
 * som gyldig UT dagen, slik kunden leser «Gjelder til 4. juli».
 */

const URGENT_HOURS = 48
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export function formatPeriod(from: string | null, to: string | null): string | null {
  if (!from && !to) return null
  const f = (d: string) => new Date(d).toLocaleDateString("nb-NO", { day: "numeric", month: "long" })
  if (from && to) return `Gjelder ${f(from)} – ${f(to)}`
  if (from) return `Gjelder fra ${f(from)}`
  return `Gjelder til ${f(to!)}`
}

/** «Slutter i dag / i morgen / snart» når validTo er innen 48 t, ellers null. */
export function expiryLabel(validTo: string | null, now: Date = new Date()): string | null {
  if (!validTo) return null
  const raw = validTo.trim()
  const end = DATE_ONLY.test(raw) ? new Date(`${raw}T23:59:59`) : new Date(raw)
  if (Number.isNaN(end.getTime())) return null
  const msLeft = end.getTime() - now.getTime()
  if (msLeft <= 0 || msLeft > URGENT_HOURS * 3_600_000) return null
  const dayDiff = calendarDayDiff(now, end)
  if (dayDiff <= 0) return "Slutter i dag"
  if (dayDiff === 1) return "Slutter i morgen"
  return "Slutter snart"
}

function calendarDayDiff(a: Date, b: Date): number {
  const at = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()
  const bt = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime()
  return Math.round((bt - at) / 86_400_000)
}
