"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, X, Loader2, ImageUp, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

/**
 * Mobil hurtig-flyt: knips et bilde → last opp til storage → åpne den fulle
 * editoren med bildet ferdig vedlagt. Der velger du type (Tilbud/varekort,
 * Konkurranse, Nyhet, Galleri …) og fyller alle felt (pris, førpris, periode,
 * vis på …). Ingen duplisering av editoren — kun et raskt inngangspunkt.
 * Vises kun på mobil (md:hidden) som en flytende kamera-knapp.
 */
export function QuickCapture() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setOpen(false)
    setPreview(null)
    setFile(null)
    setBusy(false)
  }

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setOpen(true)
  }

  const proceed = async () => {
    if (!file) return
    setBusy(true)
    try {
      const supabase = createClient()
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
      const path = `uploads/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      })
      if (upErr) {
        toast.error("Opplasting feilet: " + upErr.message)
        setBusy(false)
        return
      }
      const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path)
      // Åpne den fulle editoren med bildet vedlagt — velg type + fyll alle felt der.
      router.push(`/admin/kundeinnhold/ny?image=${encodeURIComponent(publicUrl)}`)
      reset()
    } catch {
      toast.error("Noe gikk galt under opplasting.")
      setBusy(false)
    }
  }

  return (
    <div className="md:hidden">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />

      {/* Flytende kamera-knapp */}
      {!open && (
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Hurtig tilbud — ta bilde"
          className="fixed z-40 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform"
          style={{ backgroundColor: "var(--brand-primary, #18181b)" }}
        >
          <Camera className="w-6 h-6" />
        </button>
      )}

      {/* Capture-ark */}
      {open && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white">
          <header className="flex items-center justify-between px-4 h-14 border-b border-zinc-100 shrink-0">
            <button onClick={reset} aria-label="Avbryt" className="p-1.5 -ml-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100">
              <X className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold text-zinc-900">Nytt tilbud</span>
            <span className="w-8" />
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Forhåndsvisning" className="w-full max-h-80 object-contain rounded-2xl bg-zinc-50 border border-zinc-200" />
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-zinc-600 border border-zinc-200 rounded-xl py-2.5"
            >
              <ImageUp className="w-4 h-4" /> Ta nytt bilde
            </button>
            <p className="text-xs text-zinc-400 text-center px-4">
              Neste steg: velg type (tilbud/varekort, nyhet, galleri …) og fyll inn pris, førpris, periode og hvor det skal vises.
            </p>
          </div>

          <div className="shrink-0 border-t border-zinc-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              onClick={proceed}
              disabled={busy}
              className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-white rounded-xl py-3 disabled:opacity-60"
              style={{ backgroundColor: "var(--brand-primary, #18181b)" }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              {busy ? "Laster opp …" : "Fortsett til detaljer"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
