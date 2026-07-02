"use client"

import { setActiveTenant } from "@/app/admin/plattform/actions"
import { LogOut } from "lucide-react"

export function ImpersonationBanner({ tenantName }: { tenantName: string }) {
  return (
    <div className="relative mx-2 mb-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">Opptrer som</p>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-semibold text-amber-200">{tenantName}</span>
        <form action={setActiveTenant.bind(null, null)}>
          <button
            type="submit"
            className="flex items-center gap-1 text-[11px] font-medium text-amber-300/80 transition-colors hover:text-amber-100"
            title="Avslutt"
          >
            <LogOut className="h-3 w-3" /> Avslutt
          </button>
        </form>
      </div>
    </div>
  )
}
