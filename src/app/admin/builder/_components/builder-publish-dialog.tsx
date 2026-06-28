"use client"

import { useState } from "react"
import { Globe, Settings2, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface BuilderPublishDialogProps {
  contentItemId: string | null
  onSaveFirst: () => Promise<void>
  onPublished: () => void
}

export function BuilderPublishDialog({ contentItemId, onSaveFirst, onPublished }: BuilderPublishDialogProps) {
  const [open, setOpen] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const supabase = createClient()

  async function handlePublishAll() {
    setPublishing(true)
    try {
      let id = contentItemId
      if (!id) {
        await onSaveFirst()
        // onSaveFirst updates state async; wait for it
        toast.error("Lagre innholdet først, prøv igjen")
        setPublishing(false)
        return
      }

      // Delete existing targets and set new target_all
      await supabase.from("content_targets").delete().eq("content_item_id", id)
      await supabase.from("content_targets").insert({
        content_item_id: id,
        target_all: true,
        chain_id: null,
        tag_id: null,
        store_id: null,
      })

      await supabase
        .from("content_items")
        .update({ status: "live", updated_at: new Date().toISOString() })
        .eq("id", id)

      toast.success("Innholdet er nå live på alle enheter!")
      setOpen(false)
      onPublished()
    } catch {
      toast.error("Feil ved publisering")
    } finally {
      setPublishing(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
      >
        <Globe className="w-3.5 h-3.5" />
        Publiser til enheter
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={() => setOpen(false)}
      />
      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-base font-bold text-zinc-900 mb-1">Publiser innhold</h2>
        <p className="text-sm text-zinc-500 mb-5">Velg hvem som skal se dette innholdet på skjermene sine.</p>

        <div className="space-y-3 mb-6">
          <button
            onClick={handlePublishAll}
            disabled={publishing}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-zinc-900">{publishing ? "Publiserer..." : "Alle enheter"}</p>
              <p className="text-xs text-zinc-500">Innholdet vises på alle skjermer umiddelbart</p>
            </div>
            {!publishing && <CheckCircle className="w-4 h-4 text-emerald-600 ml-auto flex-shrink-0" />}
          </button>

          <a
            href={contentItemId ? `/admin/publish?contentId=${contentItemId}` : "/admin/publish"}
            className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-4 h-4 text-zinc-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-zinc-900">Velg spesifikke enheter</p>
              <p className="text-xs text-zinc-500">Velg kjeder, tags eller enkeltenheter</p>
            </div>
          </a>
        </div>

        <button
          onClick={() => setOpen(false)}
          className="w-full text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          Avbryt
        </button>
      </div>
    </>
  )
}
