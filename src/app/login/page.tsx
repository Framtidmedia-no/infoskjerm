import { getLoginBranding } from "@/lib/tenant/brand-hint"
import { LoginClient } from "./login-client"

// Cookie-avhengig (tenant-hint) — kan ikke prerendres statisk.
export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const branding = await getLoginBranding()
  return <LoginClient branding={branding} />
}
