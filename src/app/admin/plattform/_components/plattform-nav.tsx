"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavItem {
  href: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: "/admin/plattform", label: "Oversikt" },
  { href: "/admin/plattform/tenants", label: "Tenants" },
  { href: "/admin/plattform/brukere", label: "Brukere" },
  { href: "/admin/plattform/skjermer", label: "Skjermer" },
  { href: "/admin/plattform/nettside", label: "Nettside" },
]

export function PlattformNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Plattform-navigasjon"
      className="mb-6 inline-flex max-w-full overflow-x-auto whitespace-nowrap rounded-xl border border-zinc-200 bg-white p-0.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)]"
    >
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/admin/plattform"
            ? pathname === item.href
            : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-[10px] px-3.5 py-1.5 text-sm font-semibold transition-all ${
              isActive
                ? "bg-zinc-900 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-900"
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
