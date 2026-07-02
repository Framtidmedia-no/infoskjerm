"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react"
import { requestPasswordReset } from "./actions"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { AuthShell } from "@/components/auth/auth-shell"

const INPUT_CLS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-3.5 text-sm text-white placeholder-zinc-600 transition-all focus:border-emerald-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/20"

export default function GlemtPassordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  // Turnstile-tokens er engangs — remount widgeten per forsøk for å få nytt token.
  const [turnstileAttempt, setTurnstileAttempt] = useState(0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !turnstileToken) return
    setLoading(true)
    setError(null)
    const res = await requestPasswordReset(email.trim(), turnstileToken)
    setLoading(false)
    if (!res.ok) {
      setError(res.error ?? "Noe gikk galt — prøv igjen.")
      setTurnstileToken(null)
      setTurnstileAttempt((n) => n + 1)
      return
    }
    setSent(true)
  }

  return (
    <AuthShell
      below={
        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Tilbake til innlogging
          </Link>
        </div>
      }
    >
      {sent ? (
        <div className="py-2 text-center">
          <div className="fx-pop mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_36px_-6px_rgba(16,185,129,0.45)]">
            <MailCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="font-display mb-1 text-2xl font-semibold tracking-tight text-white">Sjekk e-posten</h1>
          <p className="text-sm leading-relaxed text-zinc-500">
            Finnes det en konto på <span className="text-zinc-300">{email}</span>, har vi sendt en lenke for å
            velge nytt passord.
          </p>
        </div>
      ) : (
        <>
          <h1 className="font-display mb-1 text-2xl font-semibold tracking-tight text-white">Glemt passord?</h1>
          <p className="mb-6 text-sm text-zinc-500">Skriv inn e-posten din, så sender vi en lenke.</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
                E-post
              </label>
              <div className="relative">
                <Mail aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.no"
                  autoComplete="email"
                  required
                  autoFocus
                  className={INPUT_CLS}
                />
              </div>
            </div>
            <div className="min-h-[65px]">
              <TurnstileWidget key={turnstileAttempt} onToken={setTurnstileToken} theme="dark" />
            </div>
            {error && (
              <div role="alert" className="fx-shake rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-3">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="fx-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(16,185,129,0.55)] transition-all hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.985] disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Sender..." : "Send lenke"}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}
