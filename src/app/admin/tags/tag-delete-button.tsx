"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteTag } from "./actions"
import { toast } from "sonner"

export function TagDeleteButton({ tagId }: { tagId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Sikker på at du vil slette denne taggen?")) return
    setLoading(true)
    const result = await deleteTag(tagId)
    if (!result.ok) {
      toast.error("Kunne ikke slette: " + result.error)
      setLoading(false)
    } else {
      toast.success("Tag slettet")
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-red-500 hover:bg-red-50"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  )
}
