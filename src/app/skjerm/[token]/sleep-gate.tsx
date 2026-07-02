"use client"

import { useEffect, useState, type ReactNode } from "react"

/**
 * Hvile-port for kiosk-skjermer: poller /api/screen/power hvert minutt og
 * bytter mellom innholdet (våken) og en helsvart hvilevisning (sover) utenfor
 * åpningstid. Widget-iframen unmountes mens skjermen sover — ingen spilling i
 * bakgrunnen. Klokken driver sakte rundt for å unngå innbrenning.
 */

interface PowerResponse {
  ok: boolean
  desired?: "on" | "off"
  nextTransition?: string | null
  pollSeconds?: number
}

const POLL_FALLBACK_S = 60

export function SleepGate({
  token,
  initialDesired,
  initialNext,
  children,
}: {
  token: string
  initialDesired: "on" | "off"
  initialNext: string | null
  children: ReactNode
}) {
  const [desired, setDesired] = useState<"on" | "off">(initialDesired)
  const [next, setNext] = useState<string | null>(initialNext)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    let stopped = false

    async function poll() {
      let delayS = POLL_FALLBACK_S
      try {
        const res = await fetch(`/api/screen/power?token=${encodeURIComponent(token)}`, { cache: "no-store" })
        if (res.ok) {
          const data = (await res.json()) as PowerResponse
          if (data.ok && (data.desired === "on" || data.desired === "off")) {
            setDesired(data.desired)
            setNext(data.nextTransition ?? null)
          }
          if (data.pollSeconds && data.pollSeconds >= 15) delayS = data.pollSeconds
        }
      } catch {
        // Nettglipp: behold nåværende tilstand og prøv igjen — aldri svart pga. feil.
      }
      if (!stopped) timer = setTimeout(poll, delayS * 1000)
    }

    timer = setTimeout(poll, POLL_FALLBACK_S * 1000)
    return () => {
      stopped = true
      if (timer) clearTimeout(timer)
    }
  }, [token])

  if (desired === "on") return <>{children}</>
  return <SleepScreen next={next} />
}

function SleepScreen({ next }: { next: string | null }) {
  const [now, setNow] = useState(() => new Date())
  // Sakte drift (ny posisjon per minutt) så klokken aldri brenner seg fast.
  const drift = now.getMinutes()
  const dx = Math.sin(drift / 9.5) * 4
  const dy = Math.cos(drift / 7.3) * 3

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const clock = new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }).format(now)
  const opensAt = next
    ? new Intl.DateTimeFormat("nb-NO", { timeZone: "Europe/Oslo", hour: "2-digit", minute: "2-digit" }).format(new Date(next))
    : null

  return (
    <div
      data-testid="sleep-screen"
      style={{ position: "fixed", inset: 0, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
    >
      <div style={{ textAlign: "center", transform: `translate(${dx}vmin, ${dy}vmin)`, transition: "transform 60s linear" }}>
        <div style={{ fontSize: "min(9vmin, 88px)", fontWeight: 200, letterSpacing: "0.06em", color: "rgba(255,255,255,0.16)", fontVariantNumeric: "tabular-nums" }}>
          {clock}
        </div>
        {opensAt && (
          <div style={{ marginTop: "1.2vmin", fontSize: "min(2.6vmin, 24px)", fontWeight: 400, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.10)" }}>
            Skjermen våkner {opensAt}
          </div>
        )}
      </div>
    </div>
  )
}
