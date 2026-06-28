"use client"

import { useState, useTransition } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Settings2 } from "lucide-react"
import { setTagStores } from "./actions"
import { toast } from "sonner"

interface Store {
  id: string
  name: string
  chainName: string
}

interface Props {
  tagId: string
  tagName: string
  initialStoreIds: string[]
  allStores: Store[]
}

export function TagManageStoresDialog({ tagId, tagName, initialStoreIds, allStores }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set(initialStoreIds))
  const [isPending, startTransition] = useTransition()

  function toggle(storeId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(storeId)) {
        next.delete(storeId)
      } else {
        next.add(storeId)
      }
      return next
    })
  }

  function handleOpen() {
    setSelected(new Set(initialStoreIds))
    setOpen(true)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await setTagStores(tagId, Array.from(selected))
      if (result.ok) {
        toast.success("Enheter oppdatert")
        setOpen(false)
      } else {
        toast.error(result.error ?? "Feil ved lagring")
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-4 text-xs"
        onClick={handleOpen}
      >
        <Settings2 className="w-3 h-3 mr-1.5" />
        Administrer enheter ({initialStoreIds.length})
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enheter i «{tagName}»</DialogTitle>
          </DialogHeader>

          <div className="space-y-1 py-2">
            {allStores.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4 text-center">Ingen enheter er opprettet ennå.</p>
            ) : (
              allStores.map((store) => (
                <label
                  key={store.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(store.id)}
                    onChange={() => toggle(store.id)}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{store.name}</p>
                    <p className="text-xs text-zinc-400">{store.chainName}</p>
                  </div>
                </label>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Lagrer..." : `Lagre (${selected.size} enheter)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
