"use client"

import { useState } from "react"
import { Loader2, TriangleAlert, CircleHelp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  /** Kjøres ved bekreftelse; dialogen viser spinner og lukker seg når promiset er ferdig. */
  onConfirm: () => Promise<void> | void
}

/**
 * Felles bekreftelsesdialog for destruktive/viktige handlinger — erstatter
 * window.confirm og ad-hoc-mønstre, med fokusfelle og Escape via Radix.
 * Ikon-tile signaliserer alvorlighetsgrad; bekreft-knappen låses med spinner
 * mens handlingen kjører.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Bekreft",
  cancelLabel = "Avbryt",
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    if (busy) return
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <div className="flex items-start gap-4">
          <span
            className={`fx-pop flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${
              destructive
                ? "bg-red-50 text-red-600 shadow-[0_0_28px_-6px_rgba(239,68,68,0.4)]"
                : "bg-[var(--brand-light)] text-[var(--brand-primary)] shadow-[0_0_28px_-8px_color-mix(in_oklab,var(--brand-primary)_55%,transparent)]"
            }`}
          >
            {destructive ? <TriangleAlert className="h-5 w-5" /> : <CircleHelp className="h-5 w-5" />}
          </span>
          <DialogHeader className="text-left">
            <DialogTitle className="font-display tracking-tight">{title}</DialogTitle>
            {description && <DialogDescription className="leading-relaxed">{description}</DialogDescription>}
          </DialogHeader>
        </div>
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-600 ring-1 ring-zinc-200 transition-all hover:text-zinc-900 hover:ring-zinc-300 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 ${
              destructive ? "bg-red-600 hover:bg-red-500" : "bg-[var(--brand-primary)] hover:opacity-90"
            }`}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
