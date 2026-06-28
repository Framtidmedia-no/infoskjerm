"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import { createTag, updateTag } from "./actions"
import { toast } from "sonner"

interface TagFormDialogProps {
  mode: "create" | "edit"
  tagId?: string
  initialName?: string
  initialColor?: string
  trigger: React.ReactNode
}

const PRESET_COLORS = [
  "#007B40", "#E30613", "#F7A600", "#6366f1",
  "#0ea5e9", "#f59e0b", "#10b981", "#8b5cf6",
  "#ef4444", "#ec4899", "#14b8a6", "#f97316",
]

export function TagFormDialog({ mode, tagId, initialName = "", initialColor = "#6366f1", trigger }: TagFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [color, setColor] = useState(initialColor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(initialName)
      setColor(initialColor)
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, initialName, initialColor])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Navn er påkrevd"); return }
    setLoading(true)
    setError(null)

    const result = mode === "create"
      ? await createTag(name, color)
      : await updateTag(tagId!, name, color)

    setLoading(false)
    if (!result.ok) { setError(result.error ?? "Ukjent feil"); return }
    toast.success(mode === 'create' ? 'Tag opprettet' : 'Tag oppdatert')
    setOpen(false)
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger}</span>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900">
                {mode === "create" ? "Ny tag" : "Rediger tag"}
              </h2>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Navn</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  placeholder="F.eks. SUNNMØRE"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-2">Farge</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${color === c ? "border-zinc-900 scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-400 font-mono">{color}</span>
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-zinc-200 rounded-lg py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Avbryt
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: color }}
                >
                  {loading ? "Lagrer..." : mode === "create" ? "Opprett" : "Lagre"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
