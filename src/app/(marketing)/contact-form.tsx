"use client"

import { useEffect, useRef, useState } from "react"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { submitLead } from "./actions"

/**
 * Kontaktskjemaet på forsiden. Turnstile-token er engangs — widgeten
 * remountes (attempt-key) etter hvert innsendingsforsøk.
 */
export function ContactForm() {
  // Turnstile laster ~500 KB tredjeparts-JS — utsett til skjemaet er i nærheten
  // av viewporten, så sidelastingen (LCP) slipper å konkurrere med den.
  const formRef = useRef<HTMLFormElement>(null)
  const [nearViewport, setNearViewport] = useState(false)
  useEffect(() => {
    const el = formRef.current
    if (!el) return
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true)
          observer.disconnect()
        }
      },
      { rootMargin: "600px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const [name, setName] = useState("")
  const [company, setCompany] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [scope, setScope] = useState("")
  const [message, setMessage] = useState("")
  const [token, setToken] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError(null)
    setBusy(true)
    const res = await submitLead({
      name,
      company,
      email,
      phone,
      scope,
      message,
      turnstileToken: token,
    })
    setBusy(false)
    setToken(null)
    setAttempt((n) => n + 1)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="mk-form__sent" role="status">
        <p className="mk-form__sent-title">Henvendelsen er sendt.</p>
        <p>
          Takk, {name.split(" ")[0] || "du hører fra oss"} — vi svarer til {email} innen én
          virkedag.
        </p>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mk-form" noValidate>
      <div className="mk-form__grid">
        <label className="mk-field">
          <span>Navn *</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="mk-field">
          <span>Firma</span>
          <input
            type="text"
            name="organization"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
        <label className="mk-field">
          <span>E-post *</span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="mk-field">
          <span>Telefon</span>
          <input
            type="tel"
            name="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
      </div>
      <label className="mk-field">
        <span>Hvor mange skjermer og lokasjoner gjelder det?</span>
        <input
          type="text"
          name="scope"
          placeholder="F.eks. 3 skjermer på 1 lokasjon — eller bare én"
          value={scope}
          onChange={(e) => setScope(e.target.value)}
        />
      </label>
      <label className="mk-field">
        <span>Melding</span>
        <textarea
          name="message"
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>

      {nearViewport ? (
        <TurnstileWidget key={attempt} onToken={setToken} theme="light" className="mk-form__turnstile" />
      ) : (
        <div className="mk-form__turnstile" aria-hidden />
      )}

      {error ? (
        <p className="mk-form__error" role="alert">
          {error}
        </p>
      ) : null}

      <button type="submit" disabled={busy || !token} className="mk-btn mk-btn--deep">
        {busy ? "Sender …" : "Send henvendelsen"}
      </button>
      <p className="mk-form__privacy">
        Vi bruker opplysningene kun til å svare deg — se{" "}
        <a href="/personvern">personvernerklæringen</a>.
      </p>
    </form>
  )
}
