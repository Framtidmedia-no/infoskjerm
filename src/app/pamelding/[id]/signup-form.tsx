"use client"

import { useState } from "react"
import { signupForEvent } from "./actions"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { buildIcs, icsFilename } from "@/lib/ics"
import { CalendarPlus, Loader2, Minus, Plus } from "lucide-react"

const CONFETTI = ["#f5c451", "#7a2e62", "#38bdf8", "#34d399", "#f472b6", "#f5c451", "#818cf8", "#fb923c"]

function downloadIcs(ics: string, title: string): void {
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = icsFilename(title)
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function SignupForm({
  contentItemId,
  storeId,
  accent,
  accentFg,
  deadlineText,
  eventTitle,
  eventDateIso,
  eventPlace,
}: {
  contentItemId: string
  storeId: string | null
  accent: string
  /** Lesbar tekstfarge oppå accent (beregnet av siden ut fra luminans). */
  accentFg: string
  deadlineText: string | null
  /** Arrangement-info til «Legg i kalenderen» (.ics) på suksesskortet. */
  eventTitle: string
  eventDateIso: string | null
  eventPlace: string | null
}) {
  const [name, setName] = useState("")
  const [department, setDepartment] = useState("")
  const [guests, setGuests] = useState(0)
  const [dietary, setDietary] = useState("")
  const [comment, setComment] = useState("")
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  // Turnstile-tokens er engangs — remount widgeten per forsøk for å få nytt token.
  const [turnstileAttempt, setTurnstileAttempt] = useState(0)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!turnstileToken) return
    setLoading(true)
    setError(null)
    const res = await signupForEvent(contentItemId, storeId, { name, department, guests, dietary, comment, email, consent, turnstileToken })
    setLoading(false)
    if (res.ok) {
      setDone(true)
      return
    }
    setError(res.error)
    setTurnstileToken(null)
    setTurnstileAttempt((n) => n + 1)
  }

  if (done) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-white p-8 text-center shadow-xl">
        {/* Konfettidryss over suksesskortet */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-40">
          {CONFETTI.map((color, i) => (
            <i
              key={i}
              className="fx-confetti-piece"
              style={{
                left: `${8 + i * 12}%`,
                backgroundColor: color,
                ["--fx-x" as string]: `${(i % 2 === 0 ? 1 : -1) * (12 + i * 6)}px`,
                ["--fx-r" as string]: `${200 + i * 55}deg`,
                ["--fx-d" as string]: `${i * 0.12}s`,
              }}
            />
          ))}
        </div>
        <div className="fx-pop mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke={accentFg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path className="fx-draw" d="M4 12.5l5 5L20 6.5" />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-extrabold text-zinc-900">Du er påmeldt! 🎉</h2>
        <p className="mt-2 text-zinc-500">
          Vi har registrert påmeldingen din{guests > 0 ? ` med ${guests} i følge` : ""}. Gleder oss til å se deg!
        </p>
        {eventDateIso && (
          <button
            type="button"
            onClick={() => {
              const ics = buildIcs({ uid: contentItemId, title: eventTitle, dateIso: eventDateIso, place: eventPlace })
              if (ics) downloadIcs(ics, eventTitle)
            }}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl border-2 bg-white px-5 py-2.5 text-sm font-bold text-zinc-800 transition-all hover:bg-zinc-50 active:scale-[0.985]"
            style={{ borderColor: accent }}
          >
            <CalendarPlus className="h-4 w-4" style={{ color: accent }} />
            Legg i kalenderen
          </button>
        )}
      </div>
    )
  }

  const field =
    "w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-base transition-colors placeholder:text-zinc-400 focus:border-transparent focus:bg-white focus:outline-none focus:ring-2"
  const label = "mb-1.5 block text-sm font-medium text-zinc-700"
  const ring = { ["--tw-ring-color" as string]: accent }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 shadow-xl sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-2xl font-extrabold text-zinc-900">Meld deg på</h2>
        {deadlineText && (
          <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ backgroundColor: `${accent}1f`, color: "#3f3f46" }}>
            Frist {deadlineText}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="signup-name" className={label}>Navn</label>
        <input id="signup-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ditt navn" autoComplete="name" required className={field} style={ring} />
      </div>

      <div>
        <label htmlFor="signup-department" className={label}>
          Avdeling <span className="font-normal text-zinc-400">(valgfri)</span>
        </label>
        <input id="signup-department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="F.eks. ferskvare" className={field} style={ring} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <span className="text-sm font-medium text-zinc-700">Antall i følge</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGuests((g) => Math.max(0, g - 1))}
            aria-label="Færre"
            disabled={guests === 0}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-700 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-100 active:scale-95 disabled:opacity-40 disabled:shadow-none"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span aria-live="polite" className="w-6 text-center text-lg font-bold tabular-nums">{guests}</span>
          <button
            type="button"
            onClick={() => setGuests((g) => Math.min(20, g + 1))}
            aria-label="Flere"
            className="flex h-9 w-9 items-center justify-center rounded-lg shadow-sm transition-all active:scale-95"
            style={{ backgroundColor: accent, color: accentFg }}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="signup-dietary" className={label}>
          Allergier / matpreferanser <span className="font-normal text-zinc-400">(valgfri)</span>
        </label>
        <input id="signup-dietary" value={dietary} onChange={(e) => setDietary(e.target.value)} placeholder="F.eks. glutenfri, vegetar" className={field} style={ring} />
      </div>

      <div>
        <label htmlFor="signup-comment" className={label}>
          Kommentar <span className="font-normal text-zinc-400">(valgfri)</span>
        </label>
        <textarea id="signup-comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} className={field} style={ring} />
      </div>

      <div>
        <label htmlFor="signup-email" className={label}>
          E-post for bekreftelse <span className="font-normal text-zinc-400">(valgfri)</span>
        </label>
        <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="din@epost.no" inputMode="email" autoComplete="email" className={field} style={ring} />
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-zinc-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 h-4.5 w-4.5 rounded border-zinc-300"
          style={{ accentColor: accent }}
        />
        <span>Jeg samtykker til at påmeldingsopplysningene lagres for å administrere arrangementet.</span>
      </label>

      <TurnstileWidget key={turnstileAttempt} onToken={setTurnstileToken} theme="light" />

      {error && (
        <p role="alert" className="fx-shake rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !turnstileToken}
        className="fx-btn flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold transition-all active:scale-[0.985] disabled:opacity-60"
        style={{ backgroundColor: accent, color: accentFg, boxShadow: `0 12px 30px -10px ${accent}99` }}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send påmelding 🎉"}
      </button>
    </form>
  )
}
