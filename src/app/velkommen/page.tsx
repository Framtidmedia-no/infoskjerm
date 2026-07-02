import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SetPasswordForm } from "./set-password-form"
import { AuthShell } from "@/components/auth/auth-shell"

export const dynamic = "force-dynamic"

export default async function VelkommenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Uten gyldig session (utløpt/ugyldig lenke) sender vi til login.
  if (!user) redirect("/login?error=lenke_utlopt")

  const isInvite = !user.last_sign_in_at || user.user_metadata?.role != null

  return (
    <AuthShell>
      <h1 className="font-display mb-1 text-2xl font-semibold tracking-tight text-white">
        {isInvite ? "Velkommen ombord" : "Velg nytt passord"}
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-zinc-500">
        Logget inn som <span className="text-zinc-300">{user.email}</span>. Sett et passord for å fortsette.
      </p>
      <SetPasswordForm />
    </AuthShell>
  )
}
