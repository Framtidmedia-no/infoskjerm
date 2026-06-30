"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, Send, Loader2, Check } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/push/client"

type Status = "loading" | "unsupported" | "default" | "denied" | "granted"

export function NotificationsCard() {
  const [status, setStatus] = useState<Status>("loading")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) {
      setStatus("unsupported")
      return
    }
    setStatus(Notification.permission as Status)
  }, [])

  const enable = async () => {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      setStatus(perm as Status)
      if (perm !== "granted") {
        toast.error("Varsler ble ikke tillatt.")
        return
      }
      const ok = await subscribeToPush()
      toast[ok ? "success" : "error"](ok ? "Varsler er på for denne enheten." : "Kunne ikke registrere abonnement.")
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      await unsubscribeFromPush()
      toast.success("Varsler er av på denne enheten.")
    } finally {
      setBusy(false)
    }
  }

  const sendTest = async () => {
    setBusy(true)
    try {
      const res = await fetch("/api/push/test", { method: "POST" })
      const data = (await res.json()) as { ok?: boolean; sent?: number }
      if (res.ok && data.sent && data.sent > 0) toast.success("Testvarsel sendt 🎉")
      else if (res.ok) toast.message("Ingen aktive abonnement på denne kontoen ennå.")
      else toast.error("Kunne ikke sende testvarsel.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${status === "granted" ? "bg-emerald-100" : "bg-zinc-100"}`}>
            {status === "granted" ? <Bell className="w-5 h-5 text-emerald-600" /> : <BellOff className="w-5 h-5 text-zinc-500" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-zinc-900">Push-varsler</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {status === "loading" && "Sjekker status …"}
              {status === "unsupported" && "Denne nettleseren støtter ikke push. Installer appen på hjemskjermen først (iOS)."}
              {status === "default" && "Få beskjed når oppslag utløper eller en skjerm går offline."}
              {status === "denied" && "Varsler er blokkert. Skru på i nettleser-/systeminnstillingene for å bruke dem."}
              {status === "granted" && "Varsler er på for denne enheten."}
            </p>
          </div>
        </div>

        {(status === "default" || status === "granted") && (
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {status === "default" && (
              <button onClick={enable} disabled={busy} className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white rounded-xl py-2.5 px-4 disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary, #18181b)" }}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />} Slå på varsler
              </button>
            )}
            {status === "granted" && (
              <>
                <button onClick={sendTest} disabled={busy} className="flex items-center justify-center gap-1.5 text-sm font-semibold text-white rounded-xl py-2.5 px-4 disabled:opacity-50" style={{ backgroundColor: "var(--brand-primary, #18181b)" }}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send testvarsel
                </button>
                <button onClick={disable} disabled={busy} className="flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-600 rounded-xl py-2.5 px-4 border border-zinc-200 disabled:opacity-50">
                  <Check className="w-4 h-4" /> Skru av her
                </button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
