import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config"

export const dynamic = "force-dynamic"

const DIAG_SECRET = "gr-diag-9vlsfa-2026"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get("key") !== DIAG_SECRET) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  const info: Record<string, unknown> = {
    urlHost: new URL(SUPABASE_URL).host,
    anonPresent: !!SUPABASE_ANON_KEY,
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: "frank.lunde1981@gmail.com",
      password: "Flomlys@2025",
    })
    info.authOk = !error && !!data.session
    info.authError = error ? { message: error.message, status: error.status } : null
  } catch (e) {
    info.authThrew = e instanceof Error ? e.message : String(e)
  }

  return NextResponse.json(info)
}
