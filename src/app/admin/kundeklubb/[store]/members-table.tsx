"use client"

import { Download, Users } from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { SoftTable, SoftTd, SoftTh, SoftThead, SoftTr } from "@/components/ui/soft-table"

export interface MemberRow {
  id: string
  name: string
  phone: string | null
  email: string | null
  createdAt: string
}

function csvCell(v: string | null): string {
  const s = v ?? ""
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function MembersTable({ rows, storeName }: { rows: MemberRow[]; storeName: string }) {
  const exportCsv = () => {
    const header = ["Navn", "Telefon", "E-post", "Påmeldt"]
    const lines = rows.map((r) => [r.name, r.phone, r.email, new Date(r.createdAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })].map(csvCell).join(";"))
    const csv = "﻿" + [header.join(";"), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `kundeklubb-${storeName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section>
      <div className="flex items-center justify-between px-1 pb-1">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-zinc-900"><Users className="h-4 w-4 text-zinc-400" /> Medlemmer <span className="text-zinc-400">({rows.length})</span></h2>
        {rows.length > 0 && (
          <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-zinc-200 transition-all hover:text-zinc-900 hover:ring-zinc-300">
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState variant="spire" title="Ingen medlemmer ennå" hint="Når kunder skanner QR-koden på skjermen og melder seg inn, dukker de opp her." />
      ) : (
        <div className="max-h-[520px] overflow-y-auto">
          <SoftTable>
            <SoftThead>
              <SoftTh>Navn</SoftTh>
              <SoftTh>Kontakt</SoftTh>
              <SoftTh>Påmeldt</SoftTh>
            </SoftThead>
            <tbody>
              {rows.map((r, idx) => (
                <SoftTr key={r.id} index={idx}>
                  <SoftTd>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--brand-light)] font-display text-sm font-bold text-[var(--brand-primary)]">
                        {r.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="font-semibold text-zinc-900">{r.name}</span>
                    </div>
                  </SoftTd>
                  <SoftTd className="text-zinc-600">{r.phone || r.email || "—"}</SoftTd>
                  <SoftTd className="text-zinc-400">{new Date(r.createdAt).toLocaleDateString("nb-NO", { timeZone: "Europe/Oslo", day: "numeric", month: "short", year: "numeric" })}</SoftTd>
                </SoftTr>
              ))}
            </tbody>
          </SoftTable>
        </div>
      )}
    </section>
  )
}
