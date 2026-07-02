"use client"

import { Download, Inbox } from "lucide-react"
import { SoftTable, SoftTd, SoftTh, SoftThead, SoftTr } from "@/components/ui/soft-table"

export interface SignupRow {
  id: string
  name: string
  department: string | null
  guests: number
  dietary: string | null
  comment: string | null
  email: string | null
  phone: string | null
  store: string | null
  createdAt: string
}

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v)
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function SignupsTable({ rows, eventTitle }: { rows: SignupRow[]; eventTitle: string }) {
  const exportCsv = () => {
    const header = ["Navn", "Avdeling", "Følge", "Allergier", "Kommentar", "E-post", "Telefon", "Butikk", "Påmeldt"]
    const lines = rows.map((r) =>
      [
        r.name,
        r.department,
        r.guests,
        r.dietary,
        r.comment,
        r.email,
        r.phone,
        r.store,
        new Date(r.createdAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" }),
      ]
        .map(csvCell)
        .join(";")
    )
    const csv = "﻿" + [header.join(";"), ...lines].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pameldinger-${eventTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center">
        <Inbox className="mb-3 h-8 w-8 text-zinc-300" />
        <h2 className="text-sm font-bold text-zinc-900">Ingen påmeldinger ennå</h2>
        <p className="mt-1 max-w-xs text-xs text-zinc-500">Når noen skanner QR-koden på skjermen og melder seg på, dukker de opp her.</p>
      </div>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between px-1 pb-1">
        <h2 className="text-sm font-semibold text-zinc-900">Påmeldingsliste <span className="text-zinc-400">({rows.length})</span></h2>
        <button onClick={exportCsv} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-600 shadow-[0_1px_2px_rgba(16,24,40,0.06)] ring-1 ring-zinc-200 transition-all hover:text-zinc-900 hover:ring-zinc-300">
          <Download className="h-3.5 w-3.5" /> Last ned CSV
        </button>
      </div>
      <SoftTable>
        <SoftThead>
          <SoftTh>Navn</SoftTh>
          <SoftTh>Avdeling</SoftTh>
          <SoftTh>Følge</SoftTh>
          <SoftTh>Allergier</SoftTh>
          <SoftTh>Kontakt</SoftTh>
          <SoftTh>Påmeldt</SoftTh>
        </SoftThead>
        <tbody>
          {rows.map((r) => (
            <SoftTr key={r.id}>
              <SoftTd className="font-semibold text-zinc-900">
                {r.name}
                {r.comment && <span className="mt-0.5 block text-[11px] font-normal text-zinc-400">{r.comment}</span>}
              </SoftTd>
              <SoftTd className="text-zinc-600">{r.department ?? "—"}</SoftTd>
              <SoftTd className="text-zinc-600">{r.guests > 0 ? `+${r.guests}` : "—"}</SoftTd>
              <SoftTd className="text-zinc-600">{r.dietary ?? "—"}</SoftTd>
              <SoftTd className="text-zinc-600">{r.email || r.phone || "—"}</SoftTd>
              <SoftTd className="text-zinc-400">{new Date(r.createdAt).toLocaleDateString("nb-NO", { timeZone: "Europe/Oslo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</SoftTd>
            </SoftTr>
          ))}
        </tbody>
      </SoftTable>
    </section>
  )
}
