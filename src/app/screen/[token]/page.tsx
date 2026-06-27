import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ScreenDisplay } from "@/components/screen/screen-display"

export default async function ScreenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const supabase = await createClient()

  const { data: screen, error } = await supabase
    .from("screens")
    .select("id, name, store_id, status")
    .eq("token", token)
    .eq("status", "active")
    .single()

  if (error || !screen) {
    notFound()
  }

  // Update last_seen_at timestamp (fire-and-forget)
  supabase
    .from("screens")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", screen.id)
    .then(() => {})

  return <ScreenDisplay token={token} screenId={screen.id} storeId={screen.store_id} />
}
