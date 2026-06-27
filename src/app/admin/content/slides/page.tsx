import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Eye, Image as ImageIcon, Clock, GripVertical } from "lucide-react"

const slides = [
  {
    id: "1",
    title: "Sommersalg – opptil 30% rabatt",
    type: "image",
    target: "Alle butikker",
    duration: 10,
    status: "active",
    thumbnail: null,
    order: 1,
  },
  {
    id: "2",
    title: "Ukens tilbud – Rema 1000-konkurrent",
    type: "image",
    target: "EUROSPAR (6 butikker)",
    duration: 8,
    status: "active",
    thumbnail: null,
    order: 2,
  },
  {
    id: "3",
    title: "Velkommen til EUROSPAR MOA",
    type: "image",
    target: "EUROSPAR MOA",
    duration: 15,
    status: "active",
    thumbnail: null,
    order: 3,
  },
  {
    id: "4",
    title: "Nytt fra bake-off avdelingen",
    type: "image",
    target: "SPAR (9 butikker)",
    duration: 8,
    status: "draft",
    thumbnail: null,
    order: 4,
  },
  {
    id: "5",
    title: "Rekrutterings-slide – Vi søker folk!",
    type: "image",
    target: "Alle butikker",
    duration: 12,
    status: "draft",
    thumbnail: null,
    order: 5,
  },
]

const statusColors = {
  active: "bg-emerald-50 text-emerald-700",
  draft: "bg-zinc-100 text-zinc-500",
}

const statusLabels = {
  active: "Aktiv",
  draft: "Utkast",
}

export default function SlidesPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Slides"
        subtitle={`${slides.filter(s => s.status === "active").length} aktive slides`}
        actions={
          <Button size="sm">
            <Plus className="w-4 h-4" />
            Ny slide
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-3">
        {slides.map((slide) => (
          <Card key={slide.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <button className="text-zinc-300 hover:text-zinc-500 cursor-grab active:cursor-grabbing">
                  <GripVertical className="w-4 h-4" />
                </button>

                <div className="w-20 h-14 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 border border-zinc-200">
                  <ImageIcon className="w-6 h-6 text-zinc-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-900 text-sm">{slide.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                    <span>🎯 {slide.target}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {slide.duration}s
                    </span>
                  </div>
                </div>

                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[slide.status as keyof typeof statusColors]}`}>
                  {statusLabels[slide.status as keyof typeof statusLabels]}
                </span>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
