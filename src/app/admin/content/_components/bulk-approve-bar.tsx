"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { bulkApproveContent } from "../actions"
import { toast } from "sonner"

interface BulkApproveBarProps {
  pendingIds: string[]
}

export function BulkApproveBar({ pendingIds }: BulkApproveBarProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  function toggleAll() {
    if (selected.size === pendingIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(pendingIds))
    }
  }

  function handleBulkApprove() {
    const ids = Array.from(selected)
    startTransition(async () => {
      const result = await bulkApproveContent(ids)
      if (result.ok) {
        toast.success(`${result.count} innhold godkjent`)
        setSelected(new Set())
      } else {
        toast.error(result.error ?? "Noe gikk galt")
      }
    })
  }

  if (pendingIds.length === 0) return null

  return (
    <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <input
        type="checkbox"
        checked={selected.size === pendingIds.length && pendingIds.length > 0}
        onChange={toggleAll}
        className="w-4 h-4 rounded accent-amber-600"
        aria-label="Velg alle som venter godkjenning"
      />
      <span className="text-sm text-amber-800 font-medium">
        {selected.size > 0 ? `${selected.size} valgt` : `${pendingIds.length} venter godkjenning`}
      </span>
      {selected.size > 0 && (
        <>
          <Button
            size="sm"
            onClick={handleBulkApprove}
            disabled={isPending}
            className="ml-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Godkjenn {selected.size}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(new Set())}
            disabled={isPending}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </>
      )}
    </div>
  )
}
