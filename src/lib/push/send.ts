import webpush from "web-push"
import { createClient as createRawClient, type SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_URL } from "@/lib/supabase/config"

/**
 * Web Push-sending. Bruker service role (untyped klient — push_subscriptions
 * ligger ikke i den genererte Database-typen) og rydder bort døde abonnement
 * (404/410) automatisk.
 */

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  icon?: string
  requireInteraction?: boolean
}

interface SubRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface SendResult {
  sent: number
  removed: number
}

let vapidReady = false

function ensureVapid(): boolean {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || "mailto:skjerm@gangerolv.no"
  if (!publicKey || !privateKey) return false
  if (!vapidReady) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
    vapidReady = true
  }
  return true
}

/** Untyped service-role-klient for push-tabellen. */
export function pushAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY mangler")
  return createRawClient(SUPABASE_URL, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function deliver(subs: SubRow[], payload: PushPayload): Promise<SendResult> {
  if (!ensureVapid() || subs.length === 0) return { sent: 0, removed: 0 }
  const db = pushAdminClient()
  const data = JSON.stringify(payload)
  let sent = 0
  let removed = 0

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data
        )
        sent++
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode
        // 404/410 = abonnementet finnes ikke lenger → fjern det.
        if (status === 404 || status === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id)
          removed++
        }
      }
    })
  )

  return { sent, removed }
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  const db = pushAdminClient()
  const { data } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
  return deliver((data ?? []) as SubRow[], payload)
}

export async function sendPushToRoles(roles: string[], payload: PushPayload): Promise<SendResult> {
  const db = pushAdminClient()
  const { data: users } = await db.from("users").select("id").in("role", roles)
  const ids = (users ?? []).map((u: { id: string }) => u.id)
  if (ids.length === 0) return { sent: 0, removed: 0 }
  const { data } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .in("user_id", ids)
  return deliver((data ?? []) as SubRow[], payload)
}

export async function sendPushToAll(payload: PushPayload): Promise<SendResult> {
  const db = pushAdminClient()
  const { data } = await db.from("push_subscriptions").select("id, endpoint, p256dh, auth")
  return deliver((data ?? []) as SubRow[], payload)
}
