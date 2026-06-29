import { redirect } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/server"
import { SetPasswordForm } from "./set-password-form"

export const dynamic = "force-dynamic"

export default async function VelkommenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Uten gyldig session (utløpt/ugyldig lenke) sender vi til login.
  if (!user) redirect("/login?error=lenke_utlopt")

  const isInvite = !user.last_sign_in_at || user.user_metadata?.role != null

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/framtid-tech-logo-dark.png"
              alt="Framtid Tech"
              width={180}
              height={48}
              priority
              className="h-10 w-auto"
            />
          </div>
          <p className="text-zinc-500 text-sm mt-1">Infoskjerm Admin</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">
            {isInvite ? "Velkommen ombord" : "Velg nytt passord"}
          </h2>
          <p className="text-zinc-500 text-sm mb-6">
            Logget inn som <span className="text-zinc-300">{user.email}</span>. Sett et passord for å fortsette.
          </p>
          <SetPasswordForm />
        </div>
      </div>
    </div>
  )
}
