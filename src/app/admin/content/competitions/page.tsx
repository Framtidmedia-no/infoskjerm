"use client"

import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trophy, Plus, Clock, Users, Pencil, Trash2, Eye } from "lucide-react"

const competitions = [
  {
    id: "1",
    title: "Sommerens salgsmester 🏆",
    description: "Hvem selger mest i juli? Ukentlig oppdatert leaderboard. Premie: 3 000 kr i gavekort.",
    status: "active",
    target: "Alle butikker",
    startDate: "1. jul 2025",
    endDate: "31. jul 2025",
    daysLeft: 4,
    participants: 47,
    leaderboard: [
      { rank: 1, name: "Kari N.", store: "EUROSPAR MOA", value: "142 500 kr", change: "up" },
      { rank: 2, name: "Per H.", store: "SPAR ULSTEINVIK", value: "138 200 kr", change: "up" },
      { rank: 3, name: "Ola M.", store: "EUROSPAR BLINDHEIM", value: "121 800 kr", change: "down" },
      { rank: 4, name: "Lise S.", store: "JOKER GODØY", value: "118 400 kr", change: "up" },
      { rank: 5, name: "Tor A.", store: "SPAR TRESFJORD", value: "112 100 kr", change: "same" },
    ],
  },
  {
    id: "2",
    title: "Svinnjakten — minst svinn vinner",
    description: "Butikken med lavest svinnprosent i august vinner 5 000 kr til personalkassen.",
    status: "upcoming",
    target: "Alle butikker",
    startDate: "1. aug 2025",
    endDate: "31. aug 2025",
    daysLeft: null,
    participants: 0,
    leaderboard: [],
  },
  {
    id: "3",
    title: "Kasse-quiz — uke 24",
    description: "Hvem kan mest om butikkens egne produkter? Svar på 10 spørsmål.",
    status: "ended",
    target: "SPAR ELLINGSØY",
    startDate: "9. jun 2025",
    endDate: "15. jun 2025",
    daysLeft: 0,
    participants: 12,
    leaderboard: [
      { rank: 1, name: "Anne B.", store: "SPAR ELLINGSØY", value: "10/10 riktige", change: "same" },
      { rank: 2, name: "Lars K.", store: "SPAR ELLINGSØY", value: "9/10 riktige", change: "same" },
      { rank: 3, name: "Hilde T.", store: "SPAR ELLINGSØY", value: "8/10 riktige", change: "same" },
    ],
  },
]

const statusConfig = {
  active: { label: "Aktiv", variant: "success" as const, color: "bg-emerald-50 border-emerald-100" },
  upcoming: { label: "Kommer", variant: "secondary" as const, color: "bg-blue-50 border-blue-100" },
  ended: { label: "Avsluttet", variant: "outline" as const, color: "bg-zinc-50 border-zinc-100" },
}

export default function CompetitionsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Konkurranser"
        subtitle={`${competitions.filter(c => c.status === "active").length} aktive konkurranser`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Ny konkurranse
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-4">
        {competitions.map((comp) => {
          const cfg = statusConfig[comp.status as keyof typeof statusConfig]
          return (
            <Card key={comp.id} className={`border ${cfg.color}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${comp.status === "active" ? "bg-amber-100" : "bg-zinc-100"}`}>
                    <Trophy className={`w-6 h-6 ${comp.status === "active" ? "text-amber-600" : "text-zinc-400"}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-zinc-900 text-lg">{comp.title}</h3>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      {comp.daysLeft !== null && comp.daysLeft > 0 && (
                        <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {comp.daysLeft} dager igjen
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 mb-3">{comp.description}</p>
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <span>📅 {comp.startDate} – {comp.endDate}</span>
                      <span>🎯 {comp.target}</span>
                      {comp.participants > 0 && (
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{comp.participants} deltakere</span>
                      )}
                    </div>

                    {/* Leaderboard preview */}
                    {comp.leaderboard.length > 0 && (
                      <div className="mt-4 space-y-1.5">
                        {comp.leaderboard.slice(0, 3).map((entry) => (
                          <div key={entry.rank} className="flex items-center gap-3 bg-white/80 rounded-lg px-3 py-2 border border-white">
                            <span className={`text-sm font-black w-5 ${entry.rank === 1 ? "text-amber-500" : entry.rank === 2 ? "text-zinc-400" : "text-amber-700"}`}>
                              {entry.rank}.
                            </span>
                            <span className="text-sm font-medium text-zinc-800 flex-1">{entry.name}</span>
                            <span className="text-xs text-zinc-500">{entry.store}</span>
                            <span className="text-sm font-bold text-emerald-700">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
