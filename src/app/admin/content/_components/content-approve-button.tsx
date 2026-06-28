"use client"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { quickApprove } from "../actions"

export function ContentApproveButton({ itemId }: { itemId: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-emerald-600 hover:bg-emerald-50"
      onClick={() => quickApprove(itemId)}
    >
      <CheckCircle2 className="w-4 h-4 mr-1" />Godkjenn
    </Button>
  )
}
