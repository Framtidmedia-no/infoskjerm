"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * Sticky seksjonsnav for Innstillinger (Linear-stil): venstre spor med
 * scrollspy — aktiv seksjon markeres med brand-farget kant mens man scroller.
 */
export function SettingsNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "")

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: "-90px 0px -55% 0px" }
    )
    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav aria-label="Innstillinger-seksjoner" className="sticky top-24 hidden w-44 flex-shrink-0 self-start lg:block">
      <p className="mb-2 pl-3.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Seksjoner</p>
      <ul className="space-y-0.5 border-l border-zinc-200">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                "-ml-px block border-l-2 py-1.5 pl-3.5 text-[13px] transition-all",
                active === s.id
                  ? "border-[var(--brand-primary)] font-semibold text-zinc-900"
                  : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-900"
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
