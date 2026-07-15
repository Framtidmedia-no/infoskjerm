import { requireSurface } from "@/lib/admin/require-surface"

/** Hele kundeskjerm-seksjonen (liste, ny, rediger, bulk, del) krever kundeflaten. */
export default async function KundeinnholdLayout({ children }: { children: React.ReactNode }) {
  await requireSurface("kunde")
  return children
}
