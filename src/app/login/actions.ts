"use server"

import { createClient } from "@/lib/supabase/server"
import { logAudit } from "@/lib/admin/audit"

/**
 * Records a successful login in the audit trail. Called from the client right
 * after signInWithPassword succeeds — by then the session cookie is set, so the
 * server can resolve the now-authenticated user. Best-effort.
 */
export async function logLoginEvent(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await logAudit({
    userId: user.id,
    userEmail: user.email ?? null,
    action: "auth.login",
    entityType: "auth",
    entityId: user.id,
    summary: "Logget inn",
  })
}
