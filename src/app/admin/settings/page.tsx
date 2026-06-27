"use client"

import { useState } from "react"
import { Topbar } from "@/components/admin/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, Copy, RefreshCw, Check, Plus, Trash2, Wifi, WifiOff, Tv2, Info } from "lucide-react"

const devices = [
  {
    id: "dev_01",
    name: "EUROSPAR MOA – Hoveddisplay",
    store: "EUROSPAR MOA",
    token: "sk_moa_x7k2p9m",
    status: "online",
    lastSeen: "Akkurat nå",
    resolution: "1920×1080",
    os: "Raspberry Pi OS 12",
    model: "Raspberry Pi 4B 4GB",
  },
  {
    id: "dev_02",
    name: "SPAR ULSTEINVIK – Inngangsskjerm",
    store: "SPAR ULSTEINVIK",
    token: "sk_ulst_q3r8w1n",
    status: "online",
    lastSeen: "2 min siden",
    resolution: "1920×1080",
    os: "Raspberry Pi OS 12",
    model: "Raspberry Pi 4B 4GB",
  },
  {
    id: "dev_03",
    name: "JOKER GODØY – Veggskjerm",
    store: "JOKER GODØY",
    token: "sk_godo_y5t4z8v",
    status: "offline",
    lastSeen: "3 timer siden",
    resolution: "1920×1080",
    os: "Raspberry Pi OS 12",
    model: "Raspberry Pi 4B 4GB",
  },
]

const stores = [
  "EUROSPAR BLINDHEIM", "EUROSPAR HAREID", "EUROSPAR MOA", "EUROSPAR LARSGÅRDEN",
  "EUROSPAR ÅLESUND STORSENTER", "EUROSPAR ØRSTA", "JOKER GODØY", "JOKER ÅHEIM",
  "SPAR ELLINGSØY", "SPAR HORNINDAL", "SPAR LANGEVÅG", "SPAR RAUDEBERG",
  "SPAR STRAUMANE", "SPAR TRESFJORD", "SPAR ULSTEINVIK", "SPAR FISKÅ",
]

function TokenCell({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const url = `https://info.gange-rolv.no/screen/${token}`
  const copy = () => {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono text-zinc-600 truncate max-w-[220px]">
        /screen/{token}
      </code>
      <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={copy}>
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  )
}

export default function SettingsPage() {
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [newDeviceName, setNewDeviceName] = useState("")
  const [newDeviceStore, setNewDeviceStore] = useState("")

  return (
    <div className="flex flex-col flex-1">
      <Topbar
        title="Innstillinger"
        subtitle="Enheter, skjermer og systemkonfigurasjon"
      />

      <div className="flex-1 p-6 space-y-6">
        {/* Device registration */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tv2 className="w-4 h-4 text-zinc-500" />
              Registrerte Raspberry Pi-enheter
            </CardTitle>
            <Button size="sm" onClick={() => setShowAddDevice(!showAddDevice)}>
              <Plus className="w-4 h-4" />
              Legg til enhet
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Add device form */}
            {showAddDevice && (
              <div className="mx-5 mb-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-start gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Slik kobler du til en Raspberry Pi</p>
                    <ol className="text-xs text-blue-700 mt-1 space-y-1 list-decimal list-inside">
                      <li>Installer Raspberry Pi OS Lite (64-bit) på SD-kort</li>
                      <li>Koble Pi til TV via HDMI og til nettverk via ethernet eller WiFi</li>
                      <li>Generer en skjerm-URL nedenfor og noter deg token-koden</li>
                      <li>Åpne terminal på Pi og kjør oppsettsscriptet (se docs)</li>
                      <li>Pi åpner Chromium i kiosk-modus med din skjerm-URL automatisk</li>
                    </ol>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Navn på enhet</label>
                    <input
                      type="text"
                      value={newDeviceName}
                      onChange={e => setNewDeviceName(e.target.value)}
                      placeholder="F.eks. EUROSPAR MOA – Hoveddisplay"
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-700 block mb-1">Tilknytt butikk</label>
                    <select
                      value={newDeviceStore}
                      onChange={e => setNewDeviceStore(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                    >
                      <option value="">Velg butikk...</option>
                      {stores.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" disabled={!newDeviceName || !newDeviceStore}>
                    Generer skjerm-URL
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddDevice(false)}>
                    Avbryt
                  </Button>
                </div>
              </div>
            )}

            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-5 py-3">Enhet</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Skjerm-URL</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Sist sett</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {devices.map((dev) => (
                  <tr key={dev.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${dev.status === "online" ? "bg-emerald-50" : "bg-zinc-100"}`}>
                          <Monitor className={`w-4 h-4 ${dev.status === "online" ? "text-emerald-600" : "text-zinc-400"}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{dev.name}</p>
                          <p className="text-xs text-zinc-400">{dev.store} · {dev.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${dev.status === "online" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"}`}>
                        {dev.status === "online"
                          ? <Wifi className="w-3 h-3" />
                          : <WifiOff className="w-3 h-3" />}
                        {dev.status === "online" ? "Online" : "Offline"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <TokenCell token={dev.token} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-zinc-500">{dev.lastSeen}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Regenerer token">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Setup instructions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4 text-zinc-500" />
              Oppsettsveiledning for Raspberry Pi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-zinc-950 rounded-xl p-5 font-mono text-sm space-y-3">
              <p className="text-zinc-400 text-xs mb-2"># Kjør dette på Raspberry Pi etter OS-installasjon</p>
              <p className="text-emerald-400">curl -sSL https://info.gange-rolv.no/setup.sh | bash</p>
              <p className="text-zinc-500 text-xs mt-2"># Scriptet installerer Chromium, setter opp autostart i kiosk-modus</p>
              <p className="text-zinc-500 text-xs"># og konfigurerer HDMI-CEC for TV-strømstyring</p>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-zinc-400 text-xs mb-2"># Eller manuelt:</p>
                <p className="text-white">SCREEN_TOKEN=<span className="text-amber-400">din-token-her</span></p>
                <p className="text-white">SCREEN_URL=<span className="text-blue-400">https://info.gange-rolv.no/screen/$SCREEN_TOKEN</span></p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-zinc-600">
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="font-semibold text-zinc-800 mb-1">Anbefalt hardware</p>
                <p>Raspberry Pi 4B 4GB</p>
                <p>LG 55" 4K TV (HDMI)</p>
                <p>32GB microSD (Class 10)</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="font-semibold text-zinc-800 mb-1">OS</p>
                <p>Raspberry Pi OS Lite</p>
                <p>64-bit (Bookworm)</p>
                <p>Chromium kiosk-modus</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3">
                <p className="font-semibold text-zinc-800 mb-1">Nettverk</p>
                <p>Ethernet anbefalt</p>
                <p>WiFi støttes</p>
                <p>Port 443 (HTTPS) åpen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
