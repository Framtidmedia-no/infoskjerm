"use client"
import { XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { rejectContentItem } from "../actions"

export function ContentRejectButton({ itemId }: { itemId: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-red-600 hover:bg-red-50"
      onClick={() => rejectContentItem(itemId)}
    >
      <XCircle className="w-4 h-4 mr-1" />Avvis
    </Button>
  )
}
