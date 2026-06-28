import { Button } from "@/components/ui/button"
import { Topbar } from "@/components/admin/topbar"
import { createContentItem } from "./actions"
import { Newspaper, Trophy, BarChart2, CloudSun, ImageIcon } from "lucide-react"
import Link from "next/link"

const CONTENT_TYPES = [
  {
    key: "news",
    label: "Nyhet",
    desc: "Intern informasjon, beskjeder og nyheter til ansatte",
    icon: Newspaper,
    color: "bg-blue-50 border-blue-200 text-blue-700",
  },
  {
    key: "competition",
    label: "Konkurranse",
    desc: "Ukens konkurranse med leaderboard og premie",
    icon: Trophy,
    color: "bg-amber-50 border-amber-200 text-amber-700",
  },
  {
    key: "stats",
    label: "Salgstall",
    desc: "Dagsomsetning, budsjett og periodetall",
    icon: BarChart2,
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
  },
  {
    key: "weather",
    label: "Vær",
    desc: "Lokalvær fra Yr.no med 5-dagers prognose",
    icon: CloudSun,
    color: "bg-sky-50 border-sky-200 text-sky-700",
  },
  {
    key: "slide",
    label: "Slide / annet",
    desc: "Friform-presentasjon med valgfrie moduler",
    icon: ImageIcon,
    color: "bg-zinc-50 border-zinc-200 text-zinc-700",
  },
] as const

export default function NewContentPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Nytt innhold"
        subtitle="Velg type og gi innholdet en tittel"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/content/news">Avbryt</Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 max-w-2xl">
        <form action={createContentItem} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-zinc-900">
              Tittel
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Skriv inn en tittel..."
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-zinc-900">Type innhold</p>
            <div className="grid gap-3">
              {CONTENT_TYPES.map(({ key, label, desc, icon: Icon, color }) => (
                <label
                  key={key}
                  className="flex items-center gap-4 rounded-xl border p-4 cursor-pointer hover:bg-zinc-50 transition-colors has-[:checked]:ring-2 has-[:checked]:ring-zinc-900"
                >
                  <input
                    type="radio"
                    name="type"
                    value={key}
                    required
                    className="sr-only"
                    defaultChecked={key === "news"}
                  />
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full sm:w-auto">
            Opprett og åpne i builder →
          </Button>
        </form>
      </div>
    </div>
  )
}
