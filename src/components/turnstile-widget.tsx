"use client"

import { useEffect, useRef } from "react"

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (widgetId: string) => void
    }
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (typeof window !== "undefined" && window.turnstile) return Promise.resolve()
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script")
      script.src = SCRIPT_SRC
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        scriptPromise = null
        reject(new Error("Kunne ikke laste Turnstile-scriptet"))
      }
      document.head.appendChild(script)
    })
  }
  return scriptPromise
}

interface TurnstileWidgetProps {
  /** Kalles med token når sjekken er bestått, og med null når token utløper/feiler. */
  onToken: (token: string | null) => void
  theme?: "light" | "dark"
  className?: string
}

/**
 * Cloudflare Turnstile-widget (eksplisitt rendring, ingen npm-avhengighet).
 * Tokens er engangs — remount komponenten (f.eks. med `key`) for å hente nytt
 * token etter et innsendingsforsøk.
 */
export function TurnstileWidget({ onToken, theme = "light", className }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey) return
    let widgetId: string | null = null
    let cancelled = false

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetId = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          size: "flexible",
          callback: (token: string) => onTokenRef.current(token),
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [siteKey, theme])

  if (!siteKey) {
    return <p className="text-xs text-red-500">Sikkerhetssjekk er ikke konfigurert (NEXT_PUBLIC_TURNSTILE_SITE_KEY mangler).</p>
  }

  return <div ref={containerRef} className={className} data-testid="turnstile-widget" />
}
