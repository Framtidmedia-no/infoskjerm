"use client"

import { useEffect, useState } from "react"
import { Download, Bell, X, Share, Plus } from "lucide-react"
import { subscribeToPush } from "@/lib/push/client"

/**
 * PWA-manager: registrerer service worker, tilbyr «Installer app» (Android via
 * beforeinstallprompt, iOS via Legg-til-på-Hjem-skjerm-veiledning) og «Slå på
 * varsler» når appen kjører installert uten push-tillatelse.
 *
 * Mountes i admin-layouten — vises kun for innloggede brukere, aldri på
 * widget-/skjermsidene.
 */

const INSTALL_DISMISS_KEY = "pwa-install-dismissed-at"
const NOTIFY_DISMISS_KEY = "pwa-notify-dismissed-at"
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000 // vis igjen etter en uke

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof window === "undefined") return false
  const ua = window.navigator.userAgent
  const iOS = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ rapporterer som Mac — sjekk touch
  const iPadOS = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
  return iOS || iPadOS
}

function dismissedRecently(key: string): boolean {
  try {
    const ts = Number(localStorage.getItem(key) ?? 0)
    return Date.now() - ts < DISMISS_COOLDOWN_MS
  } catch {
    return false
  }
}

export function PwaManager() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showIosInstall, setShowIosInstall] = useState(false)
  const [showNotify, setShowNotify] = useState(false)

  // Registrer service worker
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => {})
  }, [])

  // Installer-prompt (Android/Chrome)
  useEffect(() => {
    if (isStandalone()) return
    const onPrompt = (e: Event) => {
      e.preventDefault()
      if (dismissedRecently(INSTALL_DISMISS_KEY)) return
      setInstallEvent(e as BeforeInstallPromptEvent)
      setShowInstall(true)
    }
    window.addEventListener("beforeinstallprompt", onPrompt)
    const onInstalled = () => {
      setShowInstall(false)
      setInstallEvent(null)
    }
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  // iOS-veiledning (ingen beforeinstallprompt på Safari)
  useEffect(() => {
    if (isStandalone() || dismissedRecently(INSTALL_DISMISS_KEY)) return
    if (isIos() && !installEvent) {
      const t = setTimeout(() => setShowIosInstall(true), 1500)
      return () => clearTimeout(t)
    }
  }, [installEvent])

  // Varsler-opt-in når installert uten push-tillatelse
  useEffect(() => {
    if (!isStandalone()) return
    if (!("Notification" in window)) return
    if (Notification.permission !== "default") return
    if (dismissedRecently(NOTIFY_DISMISS_KEY)) return
    const t = setTimeout(() => setShowNotify(true), 1200)
    return () => clearTimeout(t)
  }, [])

  const handleInstall = async () => {
    if (!installEvent) return
    await installEvent.prompt()
    await installEvent.userChoice
    setShowInstall(false)
    setInstallEvent(null)
  }

  const dismissInstall = () => {
    try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())) } catch {}
    setShowInstall(false)
    setShowIosInstall(false)
  }

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) return
    const perm = await Notification.requestPermission()
    setShowNotify(false)
    if (perm === "granted") await subscribeToPush()
  }

  const dismissNotify = () => {
    try { localStorage.setItem(NOTIFY_DISMISS_KEY, String(Date.now())) } catch {}
    setShowNotify(false)
  }

  return (
    <>
      {/* Installer — Android/Chrome */}
      {showInstall && installEvent && (
        <Sheet onClose={dismissInstall}>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: "var(--brand-primary, #18181b)" }}>
              <Download className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">Installer Infoskjerm</p>
              <p className="text-xs text-zinc-500 mt-0.5">Legg appen på hjemskjermen for fullskjerm, raskere tilgang og varsler.</p>
            </div>
          </div>
          <button onClick={handleInstall} className="mt-3 w-full text-sm font-semibold text-white rounded-xl py-2.5" style={{ backgroundColor: "var(--brand-primary, #18181b)" }}>
            Installer appen
          </button>
        </Sheet>
      )}

      {/* Installer — iOS-veiledning */}
      {showIosInstall && !installEvent && (
        <Sheet onClose={dismissInstall}>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white" style={{ backgroundColor: "var(--brand-primary, #18181b)" }}>
              <Plus className="w-5 h-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">Legg til på Hjem-skjerm</p>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Trykk <Share className="inline w-3.5 h-3.5 mx-0.5 -mt-0.5" /> <span className="font-medium">Del</span> nederst i Safari, og velg{" "}
                <span className="font-medium">«Legg til på Hjem-skjerm»</span> for å installere Infoskjerm.
              </p>
            </div>
          </div>
        </Sheet>
      )}

      {/* Varsler-opt-in */}
      {showNotify && (
        <Sheet onClose={dismissNotify}>
          <div className="flex items-start gap-3">
            <span className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-amber-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">Slå på varsler</p>
              <p className="text-xs text-zinc-500 mt-0.5">Få beskjed når tilbud utløper eller en skjerm går offline.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={dismissNotify} className="flex-1 text-sm font-medium text-zinc-600 rounded-xl py-2.5 border border-zinc-200">
              Ikke nå
            </button>
            <button onClick={handleEnableNotifications} className="flex-1 text-sm font-semibold text-white rounded-xl py-2.5" style={{ backgroundColor: "var(--brand-primary, #18181b)" }}>
              Slå på
            </button>
          </div>
        </Sheet>
      )}
    </>
  )
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:left-auto md:right-4 md:bottom-4 md:max-w-sm md:p-0 animate-in slide-in-from-bottom-4 duration-300">
      <div className="relative rounded-2xl bg-white border border-zinc-200 shadow-xl p-4">
        <button onClick={onClose} aria-label="Lukk" className="absolute top-2.5 right-2.5 p-1 rounded-lg text-zinc-400 hover:bg-zinc-100">
          <X className="w-4 h-4" />
        </button>
        <div className="pr-6">{children}</div>
      </div>
    </div>
  )
}
