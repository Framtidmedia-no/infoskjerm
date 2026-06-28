"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Globe, Tag, Store, Building2, Monitor, ChevronRight, CheckCircle2, Clock } from "lucide-react"

interface ChainItem {
  id: string
  name: string
  color: string
}

interface TagItem {
  id: string
  name: string
  color: string
}

interface StoreItem {
  id: string
  name: string
  chainColor: string
}

interface ContentItem {
  id: string
  title: string
  type: string
  status: string | null
  created_at: string | null
}

interface PublishWizardProps {
  chains: ChainItem[]
  tags: TagItem[]
  stores: StoreItem[]
  pendingContent: ContentItem[]
}

type TargetMode = "all" | "chains" | "tags" | "stores"

const statusConfig = {
  approved: { label: "Publisert", variant: "success" as const },
  pending_approval: { label: "Venter godkjenning", variant: "warning" as const },
  draft: { label: "Utkast", variant: "secondary" as const },
  rejected: { label: "Avvist", variant: "destructive" as const },
}

const typeLabels: Record<string, string> = {
  news: "Nyhet",
  competition: "Konkurranse",
  stats: "Salgstall",
  weather: "Vær",
  slide: "Slide",
}

export function PublishWizard({ chains, tags, stores, pendingContent }: PublishWizardProps) {
  const [targetMode, setTargetMode] = useState<TargetMode>("all")
  const [selectedChains, setSelectedChains] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedStores, setSelectedStores] = useState<string[]>([])
  const [selectedContent, setSelectedContent] = useState<string[]>([])
  const [step, setStep] = useState(1)

  const toggle = <T,>(arr: T[], setArr: (a: T[]) => void, item: T) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item])
  }

  const targetCount =
    targetMode === "all" ? stores.length :
    targetMode === "chains" ? selectedChains.length :
    targetMode === "tags" ? selectedTags.length :
    selectedStores.length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {["Velg mottakere", "Velg innhold", "Bekreft"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step === i + 1 ? "bg-zinc-900 text-white" : step > i + 1 ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-400"}`}>
              {step > i + 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 text-center">{i + 1}</span>}
              {s}
            </div>
            {i < 2 && <ChevronRight className="w-4 h-4 text-zinc-300" />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Hvem skal se dette innholdet?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Target mode selection */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { mode: "all" as TargetMode, icon: Globe, label: "Alle butikker", sub: `${stores.length} butikker` },
                { mode: "chains" as TargetMode, icon: Building2, label: "Kjeder", sub: chains.map((c) => c.name).join(", ") || "Ingen kjeder" },
                { mode: "tags" as TargetMode, icon: Tag, label: "Tags", sub: "Geografiske grupper" },
                { mode: "stores" as TargetMode, icon: Store, label: "Enkeltbutikker", sub: "Velg spesifikke" },
              ].map(({ mode, icon: Icon, label, sub }) => (
                <button
                  key={mode}
                  onClick={() => setTargetMode(mode)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${targetMode === mode ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 hover:border-zinc-300 bg-white"}`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${targetMode === mode ? "text-white" : "text-zinc-500"}`} />
                  <p className={`text-sm font-semibold ${targetMode === mode ? "text-white" : "text-zinc-900"}`}>{label}</p>
                  <p className={`text-xs mt-0.5 ${targetMode === mode ? "text-zinc-300" : "text-zinc-400"}`}>{sub}</p>
                </button>
              ))}
            </div>

            {/* Chain selector */}
            {targetMode === "chains" && (
              <div>
                <p className="text-sm font-medium text-zinc-700 mb-3">Velg kjede(r)</p>
                <div className="flex gap-3">
                  {chains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => toggle(selectedChains, setSelectedChains, chain.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-semibold text-sm transition-all ${selectedChains.includes(chain.id) ? "border-transparent text-white" : "border-zinc-200 text-zinc-700 bg-white"}`}
                      style={selectedChains.includes(chain.id) ? { backgroundColor: chain.color, borderColor: chain.color } : {}}
                    >
                      {selectedChains.includes(chain.id) && <CheckCircle2 className="w-4 h-4" />}
                      {chain.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tag selector */}
            {targetMode === "tags" && (
              <div>
                <p className="text-sm font-medium text-zinc-700 mb-3">Velg tag(s)</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggle(selectedTags, setSelectedTags, tag.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${selectedTags.includes(tag.id) ? "bg-violet-600 border-violet-600 text-white" : "border-zinc-200 text-zinc-700 bg-white hover:border-zinc-300"}`}
                    >
                      {selectedTags.includes(tag.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                      <Tag className="w-3.5 h-3.5" />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Store selector */}
            {targetMode === "stores" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-zinc-700">Velg butikker</p>
                  <button
                    onClick={() => setSelectedStores(selectedStores.length === stores.length ? [] : stores.map((s) => s.id))}
                    className="text-xs text-zinc-500 hover:text-zinc-900"
                  >
                    {selectedStores.length === stores.length ? "Fjern alle" : "Velg alle"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {stores.map((store) => (
                    <button
                      key={store.id}
                      onClick={() => toggle(selectedStores, setSelectedStores, store.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${selectedStores.includes(store.id) ? "border-zinc-900 bg-zinc-50" : "border-zinc-100 hover:border-zinc-200 bg-white"}`}
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: store.chainColor }} />
                      <span className="text-sm text-zinc-800 flex-1">{store.name}</span>
                      {selectedStores.includes(store.id) && <CheckCircle2 className="w-4 h-4 text-zinc-900" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Summary & next */}
            <div className="flex items-center justify-between pt-4 border-t border-zinc-100">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4 text-zinc-400" />
                <p className="text-sm text-zinc-600">
                  Sender til <span className="font-bold text-zinc-900">{targetMode === "all" ? stores.length : targetCount}</span> {targetMode === "chains" || targetMode === "tags" ? "kjeder/tags" : "butikker"}
                </p>
              </div>
              <Button onClick={() => setStep(2)} disabled={targetMode !== "all" && targetCount === 0}>
                Neste: Velg innhold <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Velg innhold som skal publiseres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingContent.length === 0 ? (
              <p className="text-sm text-zinc-500">Ingen innhold tilgjengelig for publisering.</p>
            ) : (
              <div className="space-y-2">
                {pendingContent.map((item) => {
                  const statusKey = (item.status ?? "draft") as keyof typeof statusConfig
                  const statusCfg = statusConfig[statusKey] ?? statusConfig.draft
                  const created = item.created_at
                    ? new Date(item.created_at).toLocaleDateString("nb-NO", { day: "numeric", month: "short", year: "numeric" })
                    : "—"

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(selectedContent, setSelectedContent, item.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${selectedContent.includes(item.id) ? "border-zinc-900 bg-zinc-50" : "border-zinc-100 hover:border-zinc-200 bg-white"}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full font-medium">
                            {typeLabels[item.type] ?? item.type}
                          </span>
                          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                        </div>
                        <p className="text-sm font-medium text-zinc-900">{item.title}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span className="text-xs text-zinc-400">{created}</span>
                        </div>
                      </div>
                      {selectedContent.includes(item.id) && <CheckCircle2 className="w-5 h-5 text-zinc-900 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>Tilbake</Button>
              <Button onClick={() => setStep(3)} disabled={selectedContent.length === 0}>
                Neste: Bekreft <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Bekreft publisering</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">Mottakere:</span>
                <span className="text-sm font-medium text-zinc-900">
                  {targetMode === "all" ? `Alle butikker (${stores.length})` :
                   targetMode === "chains" ? `${selectedChains.length} kjede(r)` :
                   targetMode === "tags" ? `${selectedTags.length} tag(s)` :
                   `${selectedStores.length} butikk(er)`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">Innhold:</span>
                <span className="text-sm font-medium text-zinc-900">{selectedContent.length} element(er) valgt</span>
              </div>
            </div>
            <p className="text-sm text-zinc-500 mb-6">Dette vil publisere valgt innhold til valgte mottakere umiddelbart.</p>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Tilbake</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Globe className="w-4 h-4" />
                Publiser nå
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
