"use client"
import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteContentItem } from "../actions"

export function ContentDeleteButton({ itemId }: { itemId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Slett dette innholdet?")) return
    setLoading(true)
    await deleteContentItem(itemId)
    setLoading(false)
  }

  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDelete} disabled={loading}>
      <Trash2 className={`w-4 h-4 ${loading ? "opacity-50" : "text-red-500"}`} />
    </Button>
  )
}
