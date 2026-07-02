"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { deleteUser } from "./actions"
import { toast } from "sonner"

export function UserDeleteButton({ userId, userLabel }: { userId: string; userLabel?: string }) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  async function handleDelete() {
    const result = await deleteUser(userId)
    if (!result.ok) {
      toast.error("Kunne ikke slette: " + result.error)
    } else {
      toast.success("Bruker slettet")
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label={userLabel ? `Slett bruker ${userLabel}` : "Slett bruker"}
        className="h-7 w-7 text-red-500 hover:bg-red-50"
        onClick={() => setConfirmOpen(true)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Slett bruker"
        description={
          userLabel
            ? `Sikker på at du vil slette ${userLabel}? Brukeren mister tilgangen umiddelbart, og dette kan ikke angres.`
            : "Sikker på at du vil slette denne brukeren? Brukeren mister tilgangen umiddelbart, og dette kan ikke angres."
        }
        confirmLabel="Slett bruker"
        destructive
        onConfirm={handleDelete}
      />
    </>
  )
}
