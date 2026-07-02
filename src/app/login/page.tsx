"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { loginWithPassword } from "./actions"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { AuthShell } from "@/components/auth/auth-shell"
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react"

const ERROR_MESSAGES: Record<string, string> = {
  lenke_ugyldig: "Lenken er ugyldig eller allerede brukt. Be om en ny.",
  lenke_utlopt: "Lenken er utløpt. Be om en ny invitasjon eller tilbakestilling.",
}

const INPUT_CLS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-3.5 text-sm text-white placeholder-zinc-600 transition-all focus:border-emerald-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/20"

function LoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  // Turnstile-tokens er engangs — remount widgeten per forsøk for å få nytt token.
  const [turnstileAttempt, setTurnstileAttempt] = useState(0)
  const [error, setError] = useState<string | null>(
    urlError ? ERROR_MESSAGES[urlError] ?? "Noe gikk galt med lenken." : null
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!turnstileToken) return
    setLoading(true)
    setError(null)

    const res = await loginWithPassword({ email, password, turnstileToken })

    if (!res.ok) {
      setError(res.error)
      setTurnstileToken(null)
      setTurnstileAttempt((n) => n + 1)
      setLoading(false)
      return
    }

    router.push("/admin")
    router.refresh()
  }

  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState("CapsLock"))

  return (
    <AuthShell
      below={
        <p className="mt-6 text-center text-xs text-zinc-600">
          Kun autoriserte brukere. Ta kontakt med administrator for tilgang.
        </p>
      }
    >
      <h1 className="font-display mb-1 text-2xl font-semibold tracking-tight text-white">Logg inn</h1>
      <p className="mb-6 text-sm text-zinc-500">Administrer infoskjermene dine</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
            E-post
          </label>
          <div className="relative">
            <Mail aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="din@epost.no"
              autoComplete="email"
              required
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Passord
          </label>
          <div className="relative">
            <Lock aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={detectCapsLock}
              onKeyUp={detectCapsLock}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className={`${INPUT_CLS} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Skjul passord" : "Vis passord"}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-300 focus-visible:outline focus-visible:outline-emerald-400/60"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2">
            {capsLock ? (
              <p className="text-xs font-medium text-amber-400">Caps Lock er på</p>
            ) : (
              <span />
            )}
            <Link
              href="/glemt-passord"
              className="text-xs text-zinc-500 transition-colors hover:text-emerald-400"
            >
              Glemt passord?
            </Link>
          </div>
        </div>

        {/* Reservert høyde så widgeten ikke dytter layouten når den dukker opp */}
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
          className="fx-btn group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(16,185,129,0.55)] transition-all hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.985] disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Logger inn...
            </>
          ) : (
            <>
              Logg inn
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05070d]" />}>
      <LoginInner />
    </Suspense>
  )
}
