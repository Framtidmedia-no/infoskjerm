"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Feilgrense for admin-flatene: en uventet server-/klientfeil skal gi en
 * forståelig side med «Prøv igjen», ikke en hvit skjerm.
 * Next 16: retry-callbacken heter `unstable_retry` (tidligere `reset`).
 */
export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error("Admin-feil:", error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
        <AlertTriangle className="h-6 w-6 text-red-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-zinc-900">Noe gikk galt</p>
        <p className="max-w-md text-xs text-zinc-500">
          En uventet feil oppsto ved lasting av siden. Prøv igjen — vedvarer feilen,
          si fra til administrator{error.digest ? ` (ref: ${error.digest})` : ""}.
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={() => unstable_retry()}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
        Prøv igjen
      </Button>
    </div>
  )
}
