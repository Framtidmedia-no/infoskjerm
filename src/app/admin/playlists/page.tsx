"use client"

import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Play, Clock, Monitor, ListVideo } from "lucide-react"

const playlists = [
  {
    id: "1",
    name: "Hoved-spilleliste",
    description: "Standard innhold som kjører på alle skjermer",
    target: "Alle butikker",
    screens: 17,
    slides: 8,
    totalDuration: "4m 20s",
    status: "active",
    items: ["Nyheter", "Salgstall", "Konkurranser", "Vær", "Slides"],
  },
  {
    id: "2",
    name: "EUROSPAR Kjede",
    description: "Kjede-spesifikt innhold for alle EUROSPAR-butikker",
    target: "EUROSPAR (6 butikker)",
    screens: 6,
    slides: 5,
    totalDuration: "2m 45s",
    status: "active",
    items: ["EUROSPAR-nyheter", "Kjede-statistikk", "Slides"],
  },
  {
    id: "3",
    name: "SPAR Kjede",
    description: "Innhold for SPAR-nettverket",
    target: "SPAR (9 butikker)",
    screens: 9,
    slides: 5,
    totalDuration: "2m 30s",
    status: "active",
    items: ["SPAR-nyheter", "Kjede-statistikk", "Slides"],
  },
  {
    id: "4",
    name: "JOKER Kjede",
    description: "Innhold for JOKER-butikkene",
    target: "JOKER (2 butikker)",
    screens: 2,
    slides: 4,
    totalDuration: "2m 00s",
    status: "active",
    items: ["JOKER-nyheter", "Statistikk", "Slides"],
  },
  {
    id: "5",
    name: "Sommer-kampanje",
    description: "Sesonginnhold for sommeren 2025",
    target: "Alle butikker",
    screens: 0,
    slides: 3,
    totalDuration: "1m 10s",
    status: "draft",
    items: ["Sommer-slides", "Kampanje-news"],
  },
]

export default function PlaylistsPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Spillelister"
        subtitle={`${playlists.filter(p => p.status === "active").length} aktive spillelister`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Ny spilleliste
          </Button>
        }
      />
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-4">
          {playlists.map((pl) => (
            <Card key={pl.id} className={`hover:shadow-md transition-shadow ${pl.status === "draft" ? "opacity-70" : ""}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pl.status === "active" ? "bg-emerald-50" : "bg-zinc-100"}`}>
                      <ListVideo className={`w-5 h-5 ${pl.status === "active" ? "text-emerald-600" : "text-zinc-400"}`} />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 text-sm">{pl.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{pl.description}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${pl.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                    {pl.status === "active" ? "Aktiv" : "Utkast"}
                  </span>
                </div>

                <div className="flex gap-4 text-xs text-zinc-400 mb-3">
                  <span className="flex items-center gap-1"><Monitor className="w-3 h-3" />{pl.screens} skjermer</span>
                  <span className="flex items-center gap-1"><Play className="w-3 h-3" />{pl.slides} elementer</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{pl.totalDuration}</span>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {pl.items.map((item) => (
                    <span key={item} className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{item}</span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                  <span className="text-xs text-zinc-400">🎯 {pl.target}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
