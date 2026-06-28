"use client"

import { useState, useRef, useEffect } from "react"
import { X, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createPlaylist } from "./actions"

export function PlaylistFormDialog() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName("")
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Navn er påkrevd"); return }
    setLoading(true)
    setError(null)
    const result = await createPlaylist(name)
    setLoading(false)
    if (!result.ok) { setError(result.error ?? "Ukjent feil"); return }
    setOpen(false)
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Ny spilleliste
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-zinc-900">Ny spilleliste</h2>
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
                  onChange={(e) => setName(e.target.value)}
                  placeholder="F.eks. Hoved-spilleliste"
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-300"
                />
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
                  className="flex-1 bg-zinc-900 text-white rounded-lg py-2 text-sm font-medium hover:bg-zinc-700 transition-colors disabled:opacity-50"
                >
                  {loading ? "Oppretter..." : "Opprett"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
