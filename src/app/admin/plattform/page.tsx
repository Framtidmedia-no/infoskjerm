import { Building2, Monitor, Store as StoreIcon } from "lucide-react"
import { getAdminContext } from "@/lib/admin/admin-context"
import { getCrossTenantOverview } from "@/lib/admin/cross-tenant-queries"
import { setActiveTenant } from "./actions"

function screenDotColor(online: number, total: number): string {
  if (total === 0) return "bg-zinc-300"
  if (online === 0) return "bg-red-500"
  if (online < total) return "bg-amber-500"
  return "bg-emerald-500"
}

export default async function PlattformPage() {
  const ctx = await getAdminContext()
  const overview = await getCrossTenantOverview()

  const totalTenants = overview.length
  const totalStores = overview.reduce((sum, t) => sum + t.storeCount, 0)
  const totalScreens = overview.reduce((sum, t) => sum + t.screenTotal, 0)
  const totalScreensOnline = overview.reduce((sum, t) => sum + t.screenOnline, 0)

  const kpis = [
    { label: "Tenants", value: `${totalTenants}`, suffix: "", icon: Building2, iconCls: "bg-indigo-50 text-indigo-600", glow: "rgba(99,102,241,0.10)" },
    { label: "Butikker", value: `${totalStores}`, suffix: "", icon: StoreIcon, iconCls: "bg-emerald-50 text-emerald-600", glow: "rgba(16,185,129,0.10)" },
    {
      label: "Skjermer online",
      value: `${totalScreensOnline}`,
      suffix: `/${totalScreens}`,
      icon: Monitor,
      iconCls: totalScreensOnline === 0 && totalScreens > 0 ? "bg-red-50 text-red-600" : "bg-sky-50 text-sky-600",
      glow: totalScreensOnline === 0 && totalScreens > 0 ? "rgba(239,68,68,0.10)" : "rgba(14,165,233,0.10)",
    },
  ]

  return (
    <div>
      <h1 className="font-display mb-1 text-2xl font-semibold tracking-tight text-zinc-900">Oversikt</h1>
      <p className="mb-6 text-zinc-500">Alle kunde-organisasjoner på plattformen.</p>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {kpis.map(({ label, value, suffix, icon: Icon, iconCls, glow }, i) => (
          <div
            key={label}
            className="fx-rise relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-zinc-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-6 -top-8 h-20 w-24 rounded-full"
              style={{ background: `radial-gradient(closest-side, ${glow}, transparent)` }}
            />
            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconCls}`}>
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="font-display block text-2xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums">
                {value}
                {suffix && <span className="text-base font-medium text-zinc-400">{suffix}</span>}
              </span>
              <span className="mt-1 block truncate text-[11px] text-zinc-500">{label}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="fx-rise overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]" style={{ animationDelay: "180ms" }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/60 text-left text-xs uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium text-right">Butikker</th>
              <th className="px-4 py-3 font-medium text-right">Skjermer</th>
              <th className="px-4 py-3 font-medium text-right">Brukere</th>
              <th className="px-4 py-3 font-medium text-right">Innhold</th>
              <th className="px-4 py-3 font-medium text-right"></th>
            </tr>
          </thead>
          <tbody>
            {overview.map((t) => {
              const isActive = ctx?.activeTenant?.id === t.id
              return (
                <tr key={t.id} className="border-b border-zinc-50 transition-colors last:border-b-0 hover:bg-zinc-50/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-900 shadow-sm">
                        <span className="font-display text-sm font-bold text-white">{t.name.charAt(0).toUpperCase()}</span>
                      </span>
                      <div>
                        <p className="font-semibold text-zinc-900">{t.name}</p>
                        <p className="text-xs text-zinc-400">{t.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {t.storeCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    <span className="inline-flex items-center justify-end gap-2">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${screenDotColor(
                          t.screenOnline,
                          t.screenTotal
                        )}`}
                        aria-hidden
                      />
                      {t.screenOnline}/{t.screenTotal}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {t.userCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-700">
                    {t.contentLive}/{t.contentTotal}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={setActiveTenant.bind(null, t.id)}>
                      <button
                        type="submit"
                        className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-zinc-700 hover:shadow active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                        disabled={isActive}
                      >
                        {isActive ? "Aktiv" : "Opptre som"}
                      </button>
                    </form>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
