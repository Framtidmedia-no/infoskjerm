"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deletePlaylist } from "./actions"

export function PlaylistDeleteButton({ playlistId }: { playlistId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Sikker på at du vil slette denne spillelisten?")) return
    setLoading(true)
    const result = await deletePlaylist(playlistId)
    if (!result.ok) {
      alert("Kunne ikke slette: " + result.error)
      setLoading(false)
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
