import { getCrossTenantScreens } from "@/lib/admin/cross-tenant-queries"
import { formatLastSeen } from "@/lib/admin/queries"
import { SoftTable, SoftTd, SoftTh, SoftThead, SoftTr } from "@/components/ui/soft-table"

const STATUS_CHIP: Record<"green" | "yellow" | "red", { dot: string; cls: string; label: string }> = {
  green: { dot: "bg-emerald-500", cls: "bg-emerald-50 text-emerald-700", label: "Tilkoblet" },
  yellow: { dot: "bg-amber-500", cls: "bg-amber-50 text-amber-700", label: "Ustabil" },
  red: { dot: "bg-red-500", cls: "bg-red-50 text-red-700", label: "Frakoblet" },
}

export default async function PlattformSkjermerPage() {
  const screens = await getCrossTenantScreens()

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-zinc-900 mb-1">Skjermer</h1>
      <p className="text-zinc-500 mb-6">
        Drift på tvers av alle tenants ({screens.length}).
      </p>

      <SoftTable>
        <SoftThead>
          <SoftTh>Tenant</SoftTh>
          <SoftTh>Butikk</SoftTh>
          <SoftTh>Skjerm</SoftTh>
          <SoftTh>Status</SoftTh>
          <SoftTh>Sist sett</SoftTh>
        </SoftThead>
        <tbody>
          {screens.map((s, idx) => {
            const chip = STATUS_CHIP[s.color]
            return (
              <SoftTr key={s.id} index={idx}>
                <SoftTd className="text-zinc-700">{s.tenantName}</SoftTd>
                <SoftTd className="text-zinc-700">{s.storeName}</SoftTd>
                <SoftTd className="font-semibold text-zinc-900">{s.name}</SoftTd>
                <SoftTd>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${chip.cls}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${chip.dot}`} aria-hidden />
                    {chip.label}
                  </span>
                </SoftTd>
                <SoftTd className="text-zinc-500">{formatLastSeen(s.lastHeartbeat)}</SoftTd>
              </SoftTr>
            )
          })}
        </tbody>
      </SoftTable>
    </div>
  )
}
