import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { pushAdminClient } from "@/lib/push/send"

/**
 * Lagrer/fjerner et Web Push-abonnement for den innloggede brukeren.
 * user_id utledes server-side fra sesjonen (aldri fra klienten).
 */

export const dynamic = "force-dynamic"

interface SubscriptionBody {
  endpoint?: string
  keys?: { p256dh?: string; auth?: string }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: SubscriptionBody
  try {
    body = (await req.json()) as SubscriptionBody
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 })
  }

  const endpoint = body.endpoint
  const p256dh = body.keys?.p256dh
  const auth = body.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Mangler subscription-felt" }, { status: 400 })
  }

  const userAgent = req.headers.get("user-agent")?.slice(0, 300) ?? null

  const { error } = await pushAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let endpoint: string | undefined
  try {
    endpoint = ((await req.json()) as SubscriptionBody).endpoint
  } catch {
    endpoint = undefined
  }
  if (!endpoint) return NextResponse.json({ error: "Mangler endpoint" }, { status: 400 })

  const { error } = await pushAdminClient()
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
