import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { PreviewDisplay } from "./_components/preview-display"

export const dynamic = "force-dynamic"

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: item, error } = await supabase
    .from("content_items")
    .select("id, title, body, type, status")
    .eq("id", id)
    .single()

  if (error || !item) notFound()

  return <PreviewDisplay item={item} />
}
