"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Check, Eye, EyeOff, Loader2, Lock } from "lucide-react"

const INPUT_CLS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-10 text-sm text-white placeholder-zinc-600 transition-all focus:border-emerald-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/20"

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-emerald-400" : "text-zinc-500"}`}
    >
      <span
        className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
          met ? "border-emerald-400/50 bg-emerald-500/15" : "border-white/15"
        }`}
      >
        {met && <Check className="h-2.5 w-2.5" />}
      </span>
      {children}
    </li>
  )
}

export function SetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const longEnough = password.length >= 8
  const matches = confirm.length > 0 && password === confirm

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Passordet må være minst 8 tegn.")
      return
    }
    if (password !== confirm) {
      setError("Passordene er ikke like.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError("Kunne ikke sette passord. Lenken kan være utløpt — be om en ny invitasjon.")
      setLoading(false)
      return
    }

    router.push("/admin")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Nytt passord
        </label>
        <div className="relative">
          <Lock aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            id="new-password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minst 8 tegn"
            autoComplete="new-password"
            required
            autoFocus
            className={INPUT_CLS}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            aria-label={show ? "Skjul passord" : "Vis passord"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-300 focus-visible:outline focus-visible:outline-emerald-400/60"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-xs font-medium text-zinc-400">
          Bekreft passord
        </label>
        <div className="relative">
          <Lock aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
          <input
            id="confirm-password"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Gjenta passordet"
            autoComplete="new-password"
            required
            className={INPUT_CLS}
          />
        </div>
      </div>

      <ul className="space-y-1.5 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
        <Requirement met={longEnough}>Minst 8 tegn</Requirement>
        <Requirement met={matches}>Passordene er like</Requirement>
      </ul>

      {error && (
        <div role="alert" className="fx-shake rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-3">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="fx-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(16,185,129,0.55)] transition-all hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.985] disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Lagrer...
          </>
        ) : (
          "Sett passord og fortsett"
        )}
      </button>
    </form>
  )
}
