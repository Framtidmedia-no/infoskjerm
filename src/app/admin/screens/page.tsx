import { Topbar } from "@/components/admin/topbar"
import { Button } from "@/components/ui/button"
import { PageTransition } from "@/components/admin/page-transition"
import { Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getScreensWithStore, getScreenStatusColor } from "@/lib/admin/queries"
import { ScreensRealtimeWrapper } from "./_components/screens-realtime-wrapper"

export const dynamic = "force-dynamic"

export default async function ScreensPage() {
  const supabase = await createClient()
  const rawScreens = await getScreensWithStore(supabase)

  const online = rawScreens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) === "green"
  ).length
  const offline = rawScreens.filter(
    (s) => getScreenStatusColor(s.status, s.last_heartbeat) === "red"
  ).length
  const maintenance = rawScreens.filter((s) => s.status === "maintenance").length

  // Map to the shape ScreenMapClient expects, casting nested Supabase relation
  type StoreWithChain = {
    name: string
    chains: { name: string; color: string } | null
  } | null

  const screens = rawScreens.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status ?? null,
    last_heartbeat: s.last_heartbeat,
    last_seen_at: s.last_seen_at,
    pending_command: s.pending_command,
    power_state: s.power_state,
    app_info: s.app_info,
    stores: s.stores as unknown as StoreWithChain,
  }))

  return (
    <div className="flex flex-col flex-1">
      <PageTransition>
      <Topbar
        title="Skjermer"
        subtitle={`${online} online · ${offline} offline · ${maintenance} vedlikehold`}
        actions={
          <Button size="sm" asChild>
            <Link href="/admin/screens/new">
              <Plus className="w-4 h-4" />
              Ny skjerm
            </Link>
          </Button>
        }
      />

      <div className="flex-1 p-6">
        <ScreensRealtimeWrapper screens={screens} />
      </div>
      </PageTransition>
    </div>
  )
}
