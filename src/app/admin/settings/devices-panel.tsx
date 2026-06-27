"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Monitor, Copy, RefreshCw, Check, Plus, Trash2, Wifi, WifiOff,
  Tv2, Info, Power, PowerOff, RotateCw,
} from "lucide-react"
import {
  sendCommand, createScreen, regenerateToken, deleteScreen, type ScreenCommand,
} from "./actions"

export type ScreenRow = {
  id: string
  name: string
  token: string
  status: string | null
  power_state: string
  pending_command: string | null
  last_seen_at: string | null
  app_info: string | null
  store_name: string
}

type StoreOption = { id: string; name: string }

function isOnline(lastSeen: string | null) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 90_000 // 90s
}

function relTime(iso: string | null) {
  if (!iso) return "aldri"
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "akkurat nå"
  if (m < 60) return `${m} min siden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} t siden`
  return `${Math.floor(h / 24)} d siden`
}

function ScreenUrl({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const url =
    (typeof window !== "undefined" ? window.location.origin : "") +
    "/screen/" + token
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-600 truncate max-w-[200px]">
        /screen/{token.slice(0, 14)}…
      </code>
      <Button
        variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0"
        onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
        title="Kopier full skjerm-URL"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  )
}

export function DevicesPanel({ screens, stores }: { screens: ScreenRow[]; stores: StoreOption[] }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState("")
  const [newStore, setNewStore] = useState("")
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const run = (id: string, fn: () => Promise<unknown>) => {
    setBusyId(id)
    startTransition(async () => { await fn(); setBusyId(null) })
  }

  const cmd = (id: string, c: ScreenCommand) => run(id, () => sendCommand(id, c))

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Tv2 className="w-4 h-4 text-zinc-500" />
          Registrerte skjermer ({screens.length})
        </CardTitle>
        <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="w-4 h-4" />Legg til skjerm
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {showAdd && (
          <div className="mx-5 mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700">
                Opprett en skjerm, kopier URL-en, og kjør oppsett-scriptet på Raspberry Pi-en
                med den tilhørende tokenen (se <code>pi/README.md</code>).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Navn, f.eks. EUROSPAR MOA – Inngang"
                className="text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={newStore} onChange={e => setNewStore(e.target.value)}
                className="text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Velg butikk…</option>
                {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm" disabled={!newStore || pending}
                onClick={() => run("new", async () => {
                  await createScreen(newStore, newName)
                  setNewName(""); setNewStore(""); setShowAdd(false)
                })}
              >
                {pending && busyId === "new" ? "Oppretter…" : "Opprett skjerm"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdd(false)}>Avbryt</Button>
            </div>
          </div>
        )}

        {screens.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-zinc-400">
            Ingen skjermer registrert ennå. Klikk «Legg til skjerm».
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100">
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Skjerm</th>
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Skjerm-URL</th>
                <th className="text-center text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Fjernstyring</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {screens.map(s => {
                const online = isOnline(s.last_seen_at)
                const busy = busyId === s.id && pending
                return (
                  <tr key={s.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${online ? "bg-emerald-50" : "bg-zinc-100"}`}>
                          <Monitor className={`w-4 h-4 ${online ? "text-emerald-600" : "text-zinc-400"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                          <p className="text-xs text-zinc-400">{s.store_name}{s.app_info ? ` · ${s.app_info}` : ""}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${online ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                        {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                        {online ? "Online" : "Offline"}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">{relTime(s.last_seen_at)}</p>
                    </td>
                    <td className="px-4 py-3.5"><ScreenUrl token={s.token} /></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                          disabled={busy} onClick={() => cmd(s.id, "power_on")} title="Skru på skjerm (HDMI-CEC)">
                          <Power className="w-3.5 h-3.5" />På
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 gap-1 text-zinc-600 hover:bg-zinc-100"
                          disabled={busy} onClick={() => cmd(s.id, "power_off")} title="Skru av skjerm (HDMI-CEC)">
                          <PowerOff className="w-3.5 h-3.5" />Av
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          disabled={busy} onClick={() => cmd(s.id, "reload")} title="Last innhold på nytt">
                          <RotateCw className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {s.pending_command && (
                        <p className="text-[11px] text-amber-600 text-center mt-1">venter: {s.pending_command}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          disabled={busy} onClick={() => run(s.id, () => regenerateToken(s.id))} title="Ny token">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50"
                          disabled={busy}
                          onClick={() => { if (confirm(`Slette skjermen «${s.name}»?`)) run(s.id, () => deleteScreen(s.id)) }}
                          title="Slett skjerm">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
