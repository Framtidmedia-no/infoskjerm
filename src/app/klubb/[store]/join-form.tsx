"use client"

import { useState } from "react"
import { joinKundeklubb } from "./actions"
import { Loader2, CheckCircle2 } from "lucide-react"

export function JoinForm({ storeId, accent }: { storeId: string; accent: string }) {
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await joinKundeklubb(storeId, { name, phone, email, consent })
    setLoading(false)
    if (res.ok) setDone(true)
    else setError(res.error)
  }

  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
        <CheckCircle2 className="mx-auto mb-3 h-14 w-14" style={{ color: accent }} />
        <h2 className="text-2xl font-extrabold text-zinc-900">Velkommen i klubben! 🎉</h2>
        <p className="mt-2 text-zinc-500">Du er nå påmeldt. Følg med på skjermene i butikken for medlemstilbud.</p>
      </div>
    )
  }

  const field = "w-full rounded-xl border border-zinc-200 px-4 py-3 text-base focus:outline-none focus:ring-2"

  return (
    <form onSubmit={submit} className="rounded-3xl bg-white p-6 shadow-xl space-y-3">
      <h2 className="text-xl font-extrabold text-zinc-900">Meld deg inn</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Navn" autoComplete="name"
        className={field} style={{ ["--tw-ring-color" as string]: accent }} />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobilnummer" inputMode="tel" autoComplete="tel"
        className={field} style={{ ["--tw-ring-color" as string]: accent }} />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post (valgfritt)" inputMode="email" autoComplete="email"
        className={field} style={{ ["--tw-ring-color" as string]: accent }} />
      <label className="flex items-start gap-2 text-sm text-zinc-600">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 rounded border-zinc-300" />
        <span>Jeg samtykker til å motta tilbud og nyheter, og at opplysningene lagres i tråd med personvernreglene.</span>
      </label>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <button type="submit" disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-base font-bold text-white disabled:opacity-60"
        style={{ backgroundColor: accent }}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Bli medlem – det er gratis"}
      </button>
    </form>
  )
}
