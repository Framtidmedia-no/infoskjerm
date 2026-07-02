"use client"

import { Search } from "lucide-react"

/** Topbar-knappen som åpner ⌘K-paletten (custom event — paletten bor i layouten). */
export function CommandHint() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("aapne-kommando"))}
      className="hidden items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-zinc-500 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-zinc-200 transition-all hover:text-zinc-900 hover:ring-zinc-300 md:inline-flex"
    >
      <Search className="h-3.5 w-3.5" />
      Søk
      <kbd className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500">⌘K</kbd>
    </button>
  )
}
