"use client"

import { useState } from "react"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, BarChart3, Calendar } from "lucide-react"

const periods = ["I dag", "Denne uken", "Denne måneden", "I år"]

const storeStats = [
  { name: "EUROSPAR BLINDHEIM", chain: "EUROSPAR", chainColor: "#E30613", today: 142500, budget: 150000, week: 698200, month: 2841000, pct: 95 },
  { name: "EUROSPAR HAREID", chain: "EUROSPAR", chainColor: "#E30613", today: 89300, budget: 100000, week: 431000, month: 1820000, pct: 89 },
  { name: "EUROSPAR LARSGÅRDEN", chain: "EUROSPAR", chainColor: "#E30613", today: 198700, budget: 190000, week: 942000, month: 3980000, pct: 105 },
  { name: "EUROSPAR MOA", chain: "EUROSPAR", chainColor: "#E30613", today: 312000, budget: 300000, week: 1480000, month: 6200000, pct: 104 },
  { name: "EUROSPAR ÅLESUND STORSENTER", chain: "EUROSPAR", chainColor: "#E30613", today: 428000, budget: 450000, week: 2100000, month: 8900000, pct: 95 },
  { name: "EUROSPAR ØRSTA", chain: "EUROSPAR", chainColor: "#E30613", today: 167000, budget: 160000, week: 798000, month: 3350000, pct: 104 },
  { name: "JOKER GODØY", chain: "JOKER", chainColor: "#F7A600", today: 54200, budget: 60000, week: 261000, month: 1100000, pct: 90 },
  { name: "JOKER ÅHEIM", chain: "JOKER", chainColor: "#F7A600", today: 38700, budget: 45000, week: 188000, month: 790000, pct: 86 },
  { name: "SPAR ELLINGSØY", chain: "SPAR", chainColor: "#007B40", today: 73200, budget: 75000, week: 352000, month: 1480000, pct: 98 },
  { name: "SPAR HORNINDAL", chain: "SPAR", chainColor: "#007B40", today: 41000, budget: 50000, week: 198000, month: 830000, pct: 82 },
  { name: "SPAR LANGEVÅG", chain: "SPAR", chainColor: "#007B40", today: 68900, budget: 65000, week: 331000, month: 1390000, pct: 106 },
  { name: "SPAR RAUDEBERG", chain: "SPAR", chainColor: "#007B40", today: 52100, budget: 55000, week: 251000, month: 1050000, pct: 95 },
  { name: "SPAR STRAUMANE", chain: "SPAR", chainColor: "#007B40", today: 61400, budget: 60000, week: 295000, month: 1240000, pct: 102 },
  { name: "SPAR TRESFJORD", chain: "SPAR", chainColor: "#007B40", today: 44800, budget: 48000, week: 216000, month: 908000, pct: 93 },
  { name: "SPAR ULSTEINVIK", chain: "SPAR", chainColor: "#007B40", today: 138200, budget: 130000, week: 661000, month: 2780000, pct: 106 },
  { name: "SPAR FISKÅ", chain: "SPAR", chainColor: "#007B40", today: 28400, budget: 35000, week: 137000, month: 575000, pct: 81 },
]

function fmt(n: number) {
  return n >= 1000000
    ? (n / 1000000).toFixed(1).replace(".", ",") + " mill"
    : (n / 1000).toFixed(0) + " k"
}

export default function StatsPage() {
  const [period, setPeriod] = useState("I dag")

  const totalToday = storeStats.reduce((s, r) => s + r.today, 0)
  const totalBudget = storeStats.reduce((s, r) => s + r.budget, 0)
  const avgPct = Math.round(storeStats.reduce((s, r) => s + r.pct, 0) / storeStats.length)
  const aboveBudget = storeStats.filter(r => r.pct >= 100).length

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Salgstall"
        subtitle="Oversikt over omsetning per butikk"
        actions={
          <div className="flex gap-1 bg-zinc-100 rounded-lg p-1">
            {periods.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period === p ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                {p}
              </button>
            ))}
          </div>
        }
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-zinc-500 font-medium">Total omsetning i dag</p>
              <p className="text-3xl font-black text-zinc-900 mt-1">{fmt(totalToday)}</p>
              <p className="text-xs text-zinc-400 mt-1">kr på tvers av 16 butikker</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-zinc-500 font-medium">Budsjettoppnåelse</p>
              <p className={`text-3xl font-black mt-1 ${avgPct >= 100 ? "text-emerald-600" : avgPct >= 90 ? "text-amber-600" : "text-red-600"}`}>{avgPct}%</p>
              <p className="text-xs text-zinc-400 mt-1">snitt alle butikker</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-zinc-500 font-medium">Over budsjett</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{aboveBudget}</p>
              <p className="text-xs text-zinc-400 mt-1">av 16 butikker</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-zinc-500 font-medium">Under budsjett</p>
              <p className="text-3xl font-black text-red-500 mt-1">{16 - aboveBudget}</p>
              <p className="text-xs text-zinc-400 mt-1">av 16 butikker</p>
            </CardContent>
          </Card>
        </div>

        {/* Store table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Alle butikker — {period.toLowerCase()}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Butikk</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Omsetning</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Budsjett</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3 w-48">Oppnåelse</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Uke</th>
                </tr>
              </thead>
              <tbody>
                {storeStats.sort((a, b) => b.today - a.today).map((store) => (
                  <tr key={store.name} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: store.chainColor }} />
                        <span className="text-sm font-medium text-zinc-800">{store.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-bold text-zinc-900">{fmt(store.today)}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm text-zinc-500">{fmt(store.budget)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${store.pct >= 100 ? "bg-emerald-500" : store.pct >= 90 ? "bg-amber-400" : "bg-red-400"}`}
                            style={{ width: `${Math.min(store.pct, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-1 w-14 justify-end">
                          {store.pct >= 100
                            ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                            : <TrendingDown className="w-3 h-3 text-red-400" />}
                          <span className={`text-xs font-semibold ${store.pct >= 100 ? "text-emerald-600" : store.pct >= 90 ? "text-amber-600" : "text-red-500"}`}>
                            {store.pct}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-sm text-zinc-500">{fmt(store.week)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
