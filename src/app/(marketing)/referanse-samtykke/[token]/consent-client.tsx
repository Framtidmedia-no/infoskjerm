"use client"

import { useState } from "react"
import { signReferenceConsent } from "./actions"

export function ConsentForm({ token }: { token: string }) {
  const [name, setName] = useState("")
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || !agreed) return
    setError(null)
    setBusy(true)
    const res = await signReferenceConsent({ token, signedByName: name })
    setBusy(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="mk-form__sent" role="status">
        <p className="mk-form__sent-title">Takk — samtykket er registrert.</p>
        <p>
          Vi setter stor pris på at dere vil stå som referanse. Referansen publiseres når vi
          klargjør den. Dere kan når som helst trekke samtykket ved å sende en e-post til
          hei@framtidtech.no.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mk-form" noValidate>
      <label className="mk-consent-check">
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
        <span>Jeg har lest og godtar bruken beskrevet over, og har fullmakt til å samtykke på vegne av virksomheten.</span>
      </label>
      <label className="mk-field">
        <span>Fullt navn (signatur) *</span>
        <input
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      {error ? (
        <p className="mk-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy || !agreed || name.trim().length < 2} className="mk-btn mk-btn--deep">
        {busy ? "Signerer …" : "Signer og gi samtykke"}
      </button>
    </form>
  )
}
