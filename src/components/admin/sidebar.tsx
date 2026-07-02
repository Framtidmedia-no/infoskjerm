"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Store, Monitor, Tv, Users, Settings, ChevronRight, LogOut, Newspaper, Megaphone, ScrollText, Ticket, QrCode, CalendarRange,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ImpersonationBanner } from "@/components/admin/impersonation-banner"
import { useTenantConfig } from "./tenant-config-provider"
import { TenantSwitcher, type SwitcherTenant } from "@/components/admin/tenant-switcher"

type UserRole = "super_admin" | "chain_manager" | "area_manager" | "store_manager" | "store_employee"

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  roles: UserRole[]
  matchPrefix?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const ALL_AUTHORS: UserRole[] = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"]

const navGroups: NavGroup[] = [
  {
    label: "Innhold",
    items: [
      { href: "/admin/kundeinnhold", label: "Kundeskjerm", icon: Megaphone, roles: ALL_AUTHORS, matchPrefix: true },
      { href: "/admin/innhold", label: "Internt", icon: Newspaper, roles: ALL_AUTHORS, matchPrefix: true },
    ],
  },
  {
    label: "Kampanjer",
    items: [
      { href: "/admin/invitasjoner", label: "Invitasjoner", icon: Ticket, roles: ALL_AUTHORS, matchPrefix: true },
      { href: "/admin/kundeklubb", label: "Kundeklubb", icon: QrCode, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"], matchPrefix: true },
    ],
  },
  {
    label: "Oversikt",
    items: [
      { href: "/admin/plan", label: "Planen", icon: CalendarRange, roles: ALL_AUTHORS, matchPrefix: true },
      { href: "/admin/cms", label: "Forhåndsvisning", icon: Monitor, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"], matchPrefix: true },
    ],
  },
  {
    label: "Butikker",
    items: [
      { href: "/admin/stores", label: "Butikker", icon: Store, roles: ["super_admin", "chain_manager", "area_manager"], matchPrefix: true },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/skjermer", label: "Skjermer", icon: Tv, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"], matchPrefix: true },
      { href: "/admin/users", label: "Brukere", icon: Users, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"] },
      { href: "/admin/logg", label: "Logg", icon: ScrollText, roles: ["super_admin", "chain_manager"], matchPrefix: true },
      { href: "/admin/settings", label: "Innstillinger", icon: Settings, roles: ["super_admin", "chain_manager", "area_manager", "store_manager"] },
    ],
  },
]

interface SidebarProps {
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
  /** Kalles ved navigasjon/valg — MobileNav bruker den til å lukke skuffen. */
  onNavigate?: () => void
}

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  chain_manager: "Tenant Admin",
  area_manager: "Flerenhetsadmin",
  store_manager: "Enhetsadmin",
  store_employee: "Redaktør",
}

export function Sidebar({ user, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const role = user.role as UserRole
  const { unitLabelPlural } = useTenantConfig()
  // Bytt «Butikker» → tenantens substantiv (f.eks. «Forhandlere»).
  const relabel = (s: string) => (s === "Butikker" ? unitLabelPlural : s)
  const groups = navGroups.map((g) => ({
    ...g,
    label: relabel(g.label),
    items: g.items.map((i) => ({ ...i, label: relabel(i.label) })),
  }))

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    // pt-safe: i PWA (viewport-fit=cover) skal ikke brand-headeren ligge under statusbaren/notchen.
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-white/[0.06] bg-[#0b101c] text-zinc-300 pt-[env(safe-area-inset-top)]">
      {/* Nattehimmel: tenant-tintet aurora + svakt stjernestøv (samme identitet som login) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-44"
        style={{ background: "radial-gradient(120% 90% at 50% 0%, color-mix(in oklab, var(--brand-primary) 16%, transparent), transparent 72%)" }}
      />
      <div aria-hidden className="fx-stars pointer-events-none absolute inset-0 opacity-[0.13]" />

      {/* Logo/brand */}
      <div className="relative flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl shadow-[0_8px_20px_-8px_rgba(0,0,0,0.8)]"
          style={user.chainLogoUrl ? { backgroundColor: "white" } : { backgroundColor: "var(--brand-primary)" }}
        >
          {user.chainLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.chainLogoUrl} alt={user.chainName ?? "Logo"} className="h-full w-full object-contain p-0.5" />
          ) : (
            <span className="text-sm font-bold" style={{ color: "var(--brand-fg)" }}>
              {(user.chainName ?? "Infoskjerm").charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-display truncate text-sm font-semibold leading-tight tracking-tight text-white">
            {user.orgName ?? "Infoskjerm"}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-zinc-500">
            <svg aria-hidden viewBox="0 0 16 16" className="h-2 w-2 text-emerald-400">
              <path fill="currentColor" d="M8 0c.6 4.2 3.8 7.4 8 8-4.2.6-7.4 3.8-8 8-.6-4.2-3.8-7.4-8-8 4.2-.6 7.4-3.8 8-8Z" />
            </svg>
            Administrasjon
          </p>
        </div>
      </div>

      {/* Utenfor <nav> (som scroller): nedtrekket skal legge seg OVER menyen, ikke klippes av overflow-y-auto. */}
      {role === "super_admin" && (
        <div className="relative px-2 pt-3">
          <TenantSwitcher tenants={user.tenants} activeTenantId={user.activeTenantId} onSelect={onNavigate} />
        </div>
      )}

      <nav className="relative flex-1 overflow-y-auto px-2 py-3">
        {groups.map((group) => {
          const visibleItems = group.items.filter((item) => item.roles.includes(role))
          if (visibleItems.length === 0) return null

          return (
            <div key={group.label} className="mb-4">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = item.matchPrefix
                    ? (pathname === item.href || pathname.startsWith(item.href + "/"))
                    : pathname === item.href

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        className={cn(
                          "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-150",
                          active
                            ? "font-semibold text-[var(--brand-fg)]"
                            : "text-zinc-400 hover:translate-x-0.5 hover:bg-white/[0.06] hover:text-white"
                        )}
                        style={
                          active
                            ? {
                                backgroundColor: "var(--brand-primary)",
                                boxShadow: "0 10px 24px -10px color-mix(in oklab, var(--brand-primary) 75%, transparent)",
                              }
                            : undefined
                        }
                      >
                        <Icon className={cn("h-4 w-4 flex-shrink-0 transition-transform duration-150", !active && "group-hover:scale-110")} />
                        <span className="flex-1 truncate">{item.label}</span>
                        {active && <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-70" />}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </nav>

      {user.isImpersonating && user.activeTenantName && (
        <ImpersonationBanner tenantName={user.activeTenantName} />
      )}

      {/* User footer */}
      <div className="relative border-t border-white/[0.06] px-3 py-3">
        <div className="flex items-center gap-3 px-2">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }}
          >
            {user.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-zinc-200">{user.fullName}</p>
            <p className="truncate text-xs text-zinc-500">{roleLabels[user.role] ?? user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex-shrink-0 rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
            title="Logg ut"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
