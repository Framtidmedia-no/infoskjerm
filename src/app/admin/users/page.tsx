import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, Pencil, Trash2, Shield, Building2, Store, UserCircle } from "lucide-react"

const users = [
  { id: "1", name: "Frank Lunde", email: "frank.lunde1981@gmail.com", role: "super_admin", stores: ["Alle"], chain: null, lastLogin: "I dag, 10:42" },
  { id: "2", name: "Hilde Nordmann", email: "hilde.nordmann@gangerolv.no", role: "chain_manager", stores: ["EUROSPAR (6 butikker)"], chain: "EUROSPAR", lastLogin: "I dag, 08:15" },
  { id: "3", name: "Bjørn Hansen", email: "bjorn.hansen@gangerolv.no", role: "chain_manager", stores: ["SPAR (9 butikker)"], chain: "SPAR", lastLogin: "I går" },
  { id: "4", name: "Kari Moe", email: "kari.moe@spar.no", role: "store_manager", stores: ["EUROSPAR MOA"], chain: null, lastLogin: "I dag, 09:30" },
  { id: "5", name: "Per Ola Sunde", email: "per.sunde@spar.no", role: "store_manager", stores: ["SPAR ULSTEINVIK", "SPAR ELLINGSØY"], chain: null, lastLogin: "I dag, 11:00" },
  { id: "6", name: "Lars Dalen", email: "lars.dalen@joker.no", role: "store_manager", stores: ["JOKER GODØY"], chain: null, lastLogin: "2 dager siden" },
  { id: "7", name: "Anne Kvam", email: "anne.kvam@spar.no", role: "store_employee", stores: ["EUROSPAR MOA"], chain: null, lastLogin: "I dag, 07:45" },
  { id: "8", name: "Tor Inge Myren", email: "tor.myren@spar.no", role: "store_employee", stores: ["SPAR TRESFJORD"], chain: null, lastLogin: "3 dager siden" },
]

const roleConfig = {
  super_admin: { label: "Super Admin", icon: Shield, color: "text-violet-700", bg: "bg-violet-50", badge: "default" as const },
  chain_manager: { label: "Kjedeleder", icon: Building2, color: "text-blue-700", bg: "bg-blue-50", badge: "secondary" as const },
  store_manager: { label: "Butikksjef", icon: Store, color: "text-emerald-700", bg: "bg-emerald-50", badge: "success" as const },
  store_employee: { label: "Ansatt", icon: UserCircle, color: "text-zinc-600", bg: "bg-zinc-50", badge: "outline" as const },
}

export default function UsersPage() {
  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Brukere"
        subtitle={`${users.length} brukere — 4 roller`}
        actions={<Button size="sm"><Plus className="w-4 h-4" />Ny bruker</Button>}
      />
      <div className="flex-1 p-6">
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Bruker</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Rolle</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Tilgang</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Sist innlogget</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const cfg = roleConfig[user.role as keyof typeof roleConfig]
                  const Icon = cfg.icon
                  return (
                    <tr key={user.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${cfg.bg} flex items-center justify-center`}>
                            <span className={`text-xs font-bold ${cfg.color}`}>{user.name.charAt(0)}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900">{user.name}</p>
                            <p className="text-xs text-zinc-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {user.stores.map((s) => (
                            <span key={s} className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-zinc-500">{user.lastLogin}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
