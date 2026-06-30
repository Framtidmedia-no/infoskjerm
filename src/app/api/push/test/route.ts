import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendPushToUser } from "@/lib/push/send"

/** Sender et testvarsel til den innloggede brukerens egne enheter. */

export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const res = await sendPushToUser(user.id, {
    title: "Testvarsel ✅",
    body: "Push-varsler fungerer på denne enheten.",
    url: "/admin",
    tag: "test",
  })

  return NextResponse.json({ ok: true, ...res })
}
