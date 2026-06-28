import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScreenStatusDot } from "@/components/admin/screen-status-dot"
import { AnimatedStatCard } from "./_components/animated-stat-card"
import { PageTransition } from "@/components/admin/page-transition"
import { Monitor, Store, AlertCircle, CheckCircle2, ArrowRight, UserPlus, Newspaper, Send, Rocket } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getAdminStats, getChainOverview, formatLastSeen, getScreenStatusColor } from "@/lib/admin/queries"

export const dynamic = "force-dynamic"

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  const { data: currentUser } = authUser
    ? await supabase.from("users").select("role").eq("id", authUser.id).single()
    : { data: null }
  const isSuperAdmin = currentUser?.role === "super_admin"

  const [stats, chains, activityResult] = await Promise.all([
    getAdminStats(supabase),
    getChainOverview(supabase),
    supabase
      .from("publish_log")
      .select("id, action, created_at, content_item_id, content_items(title), users(full_name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const activityLog = activityResult.data ?? []

  const { data: recentScreens } = await supabase
    .from("screens")
    .select("id, name, status, last_heartbeat, stores(name)")
    .order("last_heartbeat", { ascending: false, nullsFirst: false })
    .limit(16)

  const screens = recentScreens ?? []

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Dashboard"
        subtitle="Gange-Rolv Infoskjerm — oversikt"
        actions={
          <Button asChild size="sm" style={{ backgroundColor: "var(--brand-primary)", color: "var(--brand-fg)" }}>
            <Link href="/admin/publish">
              Publiser innhold
            </Link>
          </Button>
        }
      />

      <PageTransition>
      <div className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AnimatedStatCard
            label="Skjermer online"
            value={stats.onlineScreens}
            sublabel={`av ${stats.totalScreens} totalt`}
            icon={<Monitor className="w-5 h-5 text-emerald-600" />}
            color="bg-emerald-50"
            delay={0}
          />
          <AnimatedStatCard
            label="Enheter"
            value={stats.totalStores}
            sublabel={`${chains.length} kjeder`}
            icon={<Store className="w-5 h-5 text-blue-600" />}
            color="bg-blue-50"
            delay={0.05}
          />
          <AnimatedStatCard
            label="Til godkjenning"
            value={stats.pendingApproval}
            sublabel="venter på deg"
            icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
            color="bg-amber-50"
            delay={0.10}
          />
          <AnimatedStatCard
            label="Innhold live"
            value={stats.liveContent}
            sublabel="aktive elementer"
            icon={<CheckCircle2 className="w-5 h-5 text-violet-600" />}
            color="bg-violet-50"
            delay={0.15}
          />
        </div>

        {/* Kom i gang — vises når systemet er nyoppsatt */}
        {isSuperAdmin && stats.totalStores === 0 && (
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
              <Rocket className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-300">Kom i gang</h2>
            </div>
            <p className="text-zinc-300 text-sm mb-5">Følg disse stegene for å sette opp infoskjerm-systemet.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { step: 1, label: "Sett opp organisasjon", desc: "Opprett kjede og enheter", href: "/admin/onboarding", icon: Store, done: false },
                { step: 2, label: "Registrer skjerm", desc: "Koble til Raspberry Pi", href: "/admin/screens", icon: Monitor, done: stats.totalScreens > 0 },
                { step: 3, label: "Opprett innhold", desc: "Nyheter, slides, salgstall", href: "/admin/content/news", icon: Newspaper, done: stats.liveContent > 0 },
                { step: 4, label: "Inviter team", desc: "Legg til medarbeidere", href: "/admin/users", icon: UserPlus, done: false },
              ].map(({ step, label, desc, href, icon: Icon, done }) => (
                <Link key={step} href={href} className={`group rounded-xl p-4 border transition-all ${done ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center mb-3 ${done ? "bg-emerald-500" : "bg-white/10 group-hover:bg-white/20"}`}>
                    {done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4 text-zinc-300" />}
                  </div>
                  <p className="text-xs font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{desc}</p>
                  {!done && <p className="text-[10px] text-amber-400 mt-2 flex items-center gap-1">Steg {step} <ArrowRight className="w-2.5 h-2.5" /></p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Kom i gang for ikke-super_admin — vises til store_manager uten screens */}
        {!isSuperAdmin && stats.totalScreens === 0 && stats.liveContent === 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 mb-1">Slik kommer du i gang</h2>
              <p className="text-sm text-zinc-600">Gå til <Link href="/admin/content/news" className="underline font-medium">Nyheter</Link> og opprett ditt første innhold. Deretter bruker du <Link href="/admin/publish" className="underline font-medium">Publiser</Link> for å sende det til skjermene.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Kjeder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {chains.length === 0 && (
                <p className="text-sm text-zinc-400 text-center py-4">Ingen kjeder funnet</p>
              )}
              {chains.map((chain) => (
                <div key={chain.name} className="flex items-center gap-3">
                  <div className="w-2 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: chain.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-900">{chain.name}</p>
                      <span className="text-xs text-zinc-400">{chain.storeCount} enheter</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: chain.totalScreens > 0 ? `${(chain.onlineScreens / chain.totalScreens) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs text-zinc-500">{chain.onlineScreens}/{chain.totalScreens} online</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full mt-2 text-zinc-500" asChild>
                <Link href="/admin/stores">
                  Se alle enheter <ArrowRight className="w-3 h-3 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Skjermstatus</CardTitle>
                <Button variant="ghost" size="sm" className="text-zinc-400" asChild>
                  <Link href="/admin/screens">Se alle <ArrowRight className="w-3 h-3 ml-1" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {screens.length === 0 && (
                <div className="text-center py-8">
                  <Monitor className="w-8 h-8 text-zinc-200 mx-auto mb-2" />
                  <p className="text-sm text-zinc-400">Ingen skjermer registrert ennå</p>
                  <Button size="sm" className="mt-3" asChild>
                    <Link href="/admin/settings">Registrer første skjerm</Link>
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {screens.map((screen) => {
                  const color = getScreenStatusColor(screen.status, screen.last_heartbeat)
                  const bgMap = { green: "bg-emerald-50 border-emerald-100", yellow: "bg-amber-50 border-amber-100", red: "bg-red-50 border-red-100" }
                  const storeName = (screen.stores as { name: string } | null)?.name ?? "Ukjent"
                  return (
                    <div key={screen.id} className={`rounded-lg p-2.5 border text-center ${bgMap[color]}`}>
                      <ScreenStatusDot status={screen.status} lastHeartbeat={screen.last_heartbeat} size="sm" />
                      <p className="text-[10px] font-medium text-zinc-700 leading-tight mt-1.5">{storeName}</p>
                      <p className="text-[9px] text-zinc-400 mt-0.5">{formatLastSeen(screen.last_heartbeat)}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
        {/* Siste aktivitet */}
        {activityLog && activityLog.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-100 p-5">
            <h2 className="text-sm font-semibold text-zinc-700 mb-4 uppercase tracking-widest">Siste aktivitet</h2>
            <div className="space-y-3">
              {activityLog.map((entry) => {
                const actionLabels: Record<string, { label: string; color: string }> = {
                  published: { label: "Publisert", color: "text-emerald-600" },
                  scheduled: { label: "Planlagt", color: "text-cyan-600" },
                  approved: { label: "Godkjent", color: "text-blue-600" },
                  rejected: { label: "Avvist", color: "text-red-500" },
                  submitted_for_approval: { label: "Sendt til godkjenning", color: "text-amber-600" },
                  rolled_back: { label: "Angret", color: "text-orange-500" },
                  auto_published: { label: "Autopublisert", color: "text-emerald-600" },
                }
                const cfg = actionLabels[entry.action] ?? { label: entry.action, color: "text-zinc-500" }
                const contentTitle = (entry.content_items as { title: string } | null)?.title ?? "—"
                const userName = (entry.users as { full_name: string } | null)?.full_name ?? "System"
                const time = entry.created_at
                  ? new Date(entry.created_at).toLocaleString("nb-NO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  : "—"

                return (
                  <div key={entry.id} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 flex-shrink-0" />
                    <span className={`font-medium ${cfg.color} flex-shrink-0`}>{cfg.label}</span>
                    <span className="text-zinc-700 truncate flex-1">{contentTitle}</span>
                    <span className="text-zinc-400 flex-shrink-0">{userName}</span>
                    <span className="text-zinc-300 text-xs flex-shrink-0">{time}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      </PageTransition>
    </div>
  )
}
