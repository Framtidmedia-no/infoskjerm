"use client"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { quickApprove } from "../actions"
import { toast } from "sonner"

export function ContentApproveButton({ itemId }: { itemId: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-emerald-600 hover:bg-emerald-50"
      onClick={async () => {
        await quickApprove(itemId)
        toast.success("Innhold godkjent")
      }}
    >
      <CheckCircle2 className="w-4 h-4 mr-1" />Godkjenn
    </Button>
  )
}
