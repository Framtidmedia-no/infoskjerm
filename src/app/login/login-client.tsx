"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { loginWithPassword } from "./actions"
import { TurnstileWidget } from "@/components/turnstile-widget"
import { AuthShell, type AuthBrand } from "@/components/auth/auth-shell"
import { isBiometricSupported, isBiometricEnabled, registerBiometric } from "@/lib/biometric/client"
import { Eye, EyeOff, Loader2, Mail, Lock, ArrowRight, Fingerprint } from "lucide-react"

const ERROR_MESSAGES: Record<string, string> = {
  lenke_ugyldig: "Lenken er ugyldig eller allerede brukt. Be om en ny.",
  lenke_utlopt: "Lenken er utløpt. Be om en ny invitasjon eller tilbakestilling.",
}

// Husker at brukeren takket nei, så vi ikke maser ved hver innlogging.
const BIOMETRIC_DECLINED_KEY = "biometric-offer-declined"
// Samme nøkkel som BiometricLock bruker — settes ved aktivering her, slik at
// låsen ikke ber om ny bekreftelse rett etter at man aktiverte den på login.
const BIOMETRIC_SESSION_KEY = "biometric-unlocked"

const INPUT_CLS =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-10 pr-3.5 text-sm text-white placeholder-zinc-600 transition-all focus:border-emerald-400/60 focus:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-emerald-400/20"

function LoginInner({ branding }: { branding: AuthBrand | null }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<"login" | "biometric">("login")
  const [biometricBusy, setBiometricBusy] = useState(false)
  const [biometricError, setBiometricError] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  // Turnstile-tokens er engangs — remount widgeten per forsøk for å få nytt token.
  const [turnstileAttempt, setTurnstileAttempt] = useState(0)
  const [error, setError] = useState<string | null>(
    urlError ? ERROR_MESSAGES[urlError] ?? "Noe gikk galt med lenken." : null
  )

  const proceed = () => {
    router.push("/admin")
    router.refresh()
  }

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

    // Tilby Face ID/Touch ID-lås på støttede enheter (én gang; «Ikke nå» huskes).
    let declined = false
    try {
      declined = localStorage.getItem(BIOMETRIC_DECLINED_KEY) === "1"
    } catch {}
    if (!declined && !isBiometricEnabled() && (await isBiometricSupported())) {
      setLoading(false)
      setStep("biometric")
      return
    }
    proceed()
  }

  const enableBiometric = async () => {
    setBiometricBusy(true)
    setBiometricError(false)
    const ok = await registerBiometric(email)
    setBiometricBusy(false)
    if (!ok) {
      setBiometricError(true)
      return
    }
    try {
      sessionStorage.setItem(BIOMETRIC_SESSION_KEY, "1")
    } catch {}
    proceed()
  }

  const skipBiometric = () => {
    try {
      localStorage.setItem(BIOMETRIC_DECLINED_KEY, "1")
    } catch {}
    proceed()
  }

  const detectCapsLock = (e: React.KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState("CapsLock"))

  return (
    <AuthShell
      brand={branding}
      below={
        <p className="mt-6 text-center text-xs text-zinc-600">
          {branding
            ? "Kun autoriserte brukere · Levert av Framtid Tech"
            : "Kun autoriserte brukere. Ta kontakt med administrator for tilgang."}
        </p>
      }
    >
      {step === "biometric" ? (
        <div className="py-2 text-center">
          <div className="fx-pop mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_36px_-6px_rgba(16,185,129,0.45)]">
            <Fingerprint className="h-6 w-6 text-emerald-400" />
          </div>
          <h1 className="font-display mb-1 text-2xl font-semibold tracking-tight text-white">Lås med Face ID?</h1>
          <p className="mb-6 text-sm leading-relaxed text-zinc-500">
            Krev Face ID eller Touch ID når appen åpnes på denne enheten. Du forblir innlogget bak låsen.
          </p>
          {biometricError && (
            <div role="alert" className="fx-shake mb-4 rounded-xl border border-red-500/25 bg-red-950/40 px-4 py-3">
              <p className="text-sm text-red-300">Kunne ikke aktivere. Prøv igjen, eller hopp over.</p>
            </div>
          )}
          <button
            type="button"
            onClick={enableBiometric}
            disabled={biometricBusy}
            className="fx-btn flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-600 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_-10px_rgba(16,185,129,0.55)] transition-all hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.985] disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500 disabled:shadow-none"
          >
            {biometricBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            Aktiver Face ID / Touch ID
          </button>
          <button
            type="button"
            onClick={skipBiometric}
            className="mt-3 w-full rounded-xl py-2.5 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Ikke nå
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}
    </AuthShell>
  )
}

export function LoginClient({ branding }: { branding: AuthBrand | null }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#05070d]" />}>
      <LoginInner branding={branding} />
    </Suspense>
  )
}
