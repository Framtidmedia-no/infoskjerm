import { Sidebar } from "@/components/admin/sidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Hent brukerinfo
  const { data: profile } = await supabase
    .from("users")
    .select("full_name, role")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar user={{ email: user.email ?? "", fullName: profile?.full_name ?? "Admin", role: profile?.role ?? "super_admin" }} />
      <main className="ml-64 min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  )
}
