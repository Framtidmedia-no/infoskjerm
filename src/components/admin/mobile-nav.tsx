"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu, X, Monitor } from "lucide-react"
import { Sidebar } from "./sidebar"
import { type SwitcherTenant } from "@/components/admin/tenant-switcher"

interface MobileNavProps {
  user: {
    email: string
    fullName: string
    role: string
    chainName: string | null
    orgName: string | null
    chainColor: string | null
    chainLogoUrl: string | null
    isImpersonating: boolean
    activeTenantName: string | null
    tenants: SwitcherTenant[]
    activeTenantId: string | null
  }
}

/**
 * Mobile navigation: a top app bar with a hamburger that opens the full sidebar
 * as a slide-in drawer. The desktop sidebar is hidden below md, so this is the
 * only way to navigate on phones.
 *
 * The drawer closes via Sidebar's onNavigate callback (link taps + tenant
 * switch) and on any pathname change (covers server-action redirects like
 * «Avslutt act-as»). It must NOT close on every click inside the drawer —
 * that unmounts the tenant switcher before its dropdown can open.
 */
export function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Lukk skuffen ved rutebytte (dekker server-action-redirects som «Avslutt
  // act-as») — render-justering i stedet for effect, jf. react.dev-mønsteret.
  const [lastPathname, setLastPathname] = useState(pathname)
  if (pathname !== lastPathname) {
    setLastPathname(pathname)
    setOpen(false)
  }

  return (
    <div className="md:hidden">
      {/* Top app bar */}
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-white border-b border-zinc-100 px-4 h-14 pt-[env(safe-area-inset-top)] box-content">
        <button onClick={() => setOpen(true)} aria-label="Åpne meny" className="p-1.5 -ml-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "var(--brand-primary)" }}>
            <Monitor className="w-4 h-4" style={{ color: "var(--brand-fg)" }} />
          </span>
          <span className="font-bold text-sm text-zinc-900 truncate">{user.orgName ?? "Infoskjerm"}</span>
        </div>
        {user.isImpersonating && user.activeTenantName && (
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-2 py-0.5 truncate max-w-[40%]">
            {user.activeTenantName}
          </span>
        )}
      </header>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <Sidebar user={user} onNavigate={() => setOpen(false)} />
          <button onClick={() => setOpen(false)} aria-label="Lukk meny" className="absolute top-3 left-[15.5rem] z-10 p-1.5 rounded-lg bg-white shadow text-zinc-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}
