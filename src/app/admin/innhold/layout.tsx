import { requireSurface } from "@/lib/admin/require-surface"

/** Hele internt-seksjonen (liste, ny, rediger) krever intern-flaten. */
export default async function InnholdLayout({ children }: { children: React.ReactNode }) {
  await requireSurface("intern")
  return children
}
