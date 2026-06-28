import { Button } from "@/components/ui/button"
import { Topbar } from "@/components/admin/topbar"
import { createContentItem } from "./actions"
import { Newspaper, Trophy, BarChart2, CloudSun, ImageIcon, Zap } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"

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

type ContentTemplate = {
  id: string
  name: string
  description: string | null
  type: string
}

const TYPE_LABELS: Record<string, string> = {
  news: "Nyhet",
  competition: "Konkurranse",
  stats: "Salgstall",
  weather: "Vær",
  slide: "Slide",
}

const TYPE_COLORS: Record<string, string> = {
  news: "bg-blue-100 text-blue-700",
  competition: "bg-amber-100 text-amber-700",
  stats: "bg-emerald-100 text-emerald-700",
  weather: "bg-sky-100 text-sky-700",
  slide: "bg-zinc-100 text-zinc-700",
}

const BACK_LINKS: Record<string, string> = {
  news: "/admin/content/news",
  competition: "/admin/content/competitions",
  stats: "/admin/content/stats",
  weather: "/admin/content/weather",
  slide: "/admin/content/slides",
}

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  const preselectedType = params.type && CONTENT_TYPES.some(t => t.key === params.type)
    ? params.type as string
    : "news"

  let templates: ContentTemplate[] = []

  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single()

    if (profile?.tenant_id) {
      const { data } = await supabase
        .from("content_templates")
        .select("id, name, description, type")
        .or(`is_global.eq.true,tenant_id.eq.${profile.tenant_id}`)
        .order("sort_order")
      templates = (data ?? []) as ContentTemplate[]
    }
  }

  const backLink = BACK_LINKS[preselectedType] ?? "/admin/content/news"

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Nytt innhold"
        subtitle="Start fra en mal eller opprett fra bunnen av"
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href={backLink}>Avbryt</Link>
          </Button>
        }
      />

      <div className="flex-1 p-6 max-w-2xl space-y-8">
        {templates.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-900">Start fra en mal</h2>
              <span className="text-xs text-zinc-400">— forhåndsutfylt innhold klar til bruk</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {templates.map((tpl) => (
                <form key={tpl.id} action={createContentItem}>
                  <input type="hidden" name="title" value={tpl.name} />
                  <input type="hidden" name="type" value={tpl.type} />
                  <input type="hidden" name="template_id" value={tpl.id} />
                  <button
                    type="submit"
                    className="w-full text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-700">
                        {tpl.name}
                      </p>
                      <span
                        className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_COLORS[tpl.type] ?? "bg-zinc-100 text-zinc-600"}`}
                      >
                        {TYPE_LABELS[tpl.type] ?? tpl.type}
                      </span>
                    </div>
                    {tpl.description && (
                      <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{tpl.description}</p>
                    )}
                  </button>
                </form>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-zinc-900 mb-3">Opprett fra bunnen av</h2>
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
                      defaultChecked={key === preselectedType}
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

            {/* Publiseringsperiode */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-zinc-900">Publiseringsperiode <span className="text-zinc-400 font-normal">(valgfritt)</span></p>
              <p className="text-xs text-zinc-500">Innholdet vises kun på skjermene innenfor denne perioden. Tomt = vises alltid (så lenge det er live).</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Fra dato</label>
                  <input
                    type="date"
                    name="valid_from"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Til dato</label>
                  <input
                    type="date"
                    name="valid_to"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full sm:w-auto">
              Opprett og åpne i builder →
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
