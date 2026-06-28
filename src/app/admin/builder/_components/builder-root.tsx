"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { ScaledScreen } from "@/components/screen/scaled-screen"
import { ZoneLayoutRenderer } from "@/components/modules/zone-layout-renderer"
import { FieldRenderer } from "@/lib/builder/field-renderer"
import { BuilderPublishDialog } from "./builder-publish-dialog"
import { createClient } from "@/lib/supabase/client"
import { PREDEFINED_LAYOUTS } from "@/lib/zones/predefined-layouts"
import type { BuilderV2State, ZoneModule, ModuleSchema } from "@/lib/builder/types"
import type { Json } from "@/types/database"
import type { ModuleRow } from "@/lib/admin/modules"
import {
  Save, CheckCircle, AlertCircle, Loader2, Eye, ChevronLeft,
  Search, LayoutTemplate, Settings, Trash2, Clock, Plus,
} from "lucide-react"
import { toast } from "sonner"

interface BuilderRootProps {
  modules: ModuleRow[]
  tenantId: string
  userId: string
  initialName?: string
  initialContentItemId?: string | null
  initialLayoutId?: string
  initialZones?: Record<string, ZoneModule>
  initialDuration?: number
}

function SaveStatusIndicator({ status }: { status: BuilderV2State["saveStatus"] }) {
  if (status === "idle") return null
  return (
    <span className="flex items-center gap-1 text-xs">
      {status === "saving" && <><Loader2 className="w-3 h-3 animate-spin text-zinc-400" /><span className="text-zinc-400">Lagrer...</span></>}
      {status === "saved" && <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">Lagret</span></>}
      {status === "error" && <><AlertCircle className="w-3 h-3 text-red-500" /><span className="text-red-600">Feil</span></>}
    </span>
  )
}

// Small proportional diagram of a layout's zones
function LayoutThumbnail({ layoutId, active }: { layoutId: string; active: boolean }) {
  const layout = PREDEFINED_LAYOUTS.find((l) => l.id === layoutId)
  if (!layout) return null
  return (
    <div className={`relative w-full aspect-video rounded-md overflow-hidden border-2 transition-colors ${active ? "border-[var(--brand-primary)]" : "border-zinc-200"}`}>
      {layout.zones.map((z) => (
        <div
          key={z.id}
          className={`absolute flex items-center justify-center ${active ? "bg-[var(--brand-primary)]/15" : "bg-zinc-100"}`}
          style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%`, outline: "1px solid rgba(0,0,0,0.06)" }}
        >
          <span className="text-[7px] text-zinc-400 font-medium truncate px-0.5">{z.label}</span>
        </div>
      ))}
    </div>
  )
}

export function BuilderRoot({
  modules, tenantId, userId,
  initialName = "Nytt innhold",
  initialContentItemId = null,
  initialLayoutId = "fullscreen",
  initialZones = {},
  initialDuration = 15,
}: BuilderRootProps) {
  const supabase = createClient()

  const [state, setState] = useState<BuilderV2State>({
    contentItemId: initialContentItemId,
    name: initialName,
    layoutId: initialLayoutId,
    zones: initialZones,
    selectedZoneId: PREDEFINED_LAYOUTS.find((l) => l.id === initialLayoutId)?.zones[0]?.id ?? null,
    durationSeconds: initialDuration,
    saveStatus: "idle",
  })
  const [search, setSearch] = useState("")
  const [panelTab, setPanelTab] = useState<"layout" | "zone">("zone")

  const layout = PREDEFINED_LAYOUTS.find((l) => l.id === state.layoutId) ?? PREDEFINED_LAYOUTS[0]
  const selectedZone = layout.zones.find((z) => z.id === state.selectedZoneId) ?? null
  const selectedModule = state.selectedZoneId ? state.zones[state.selectedZoneId] : undefined

  const selectedModuleSchema: ModuleSchema | null = (() => {
    if (!selectedModule) return null
    const mod = modules.find((m) => m.key === selectedModule.moduleKey)
    if (!mod) return null
    try { return mod.schema as unknown as ModuleSchema } catch { return null }
  })()

  const setStatus = useCallback((s: BuilderV2State["saveStatus"]) => {
    setState((prev) => ({ ...prev, saveStatus: s }))
  }, [])

  const save = useCallback(async (snapshot: BuilderV2State) => {
    setStatus("saving")
    try {
      const body = JSON.parse(JSON.stringify({
        builder_v2: {
          layoutId: snapshot.layoutId,
          zones: snapshot.zones,
          durationSeconds: snapshot.durationSeconds,
        },
      })) as Json
      if (snapshot.contentItemId) {
        const { error } = await supabase
          .from("content_items")
          .update({ title: snapshot.name, body, updated_at: new Date().toISOString() })
          .eq("id", snapshot.contentItemId)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("content_items")
          .insert({ title: snapshot.name, body, type: "slide", status: "draft", tenant_id: tenantId, created_by: userId })
          .select("id")
          .single()
        if (error) throw error
        if (data) setState((prev) => ({ ...prev, contentItemId: data.id }))
      }
      setStatus("saved")
    } catch {
      setStatus("error")
    }
  }, [supabase, tenantId, userId, setStatus])

  // Debounced autosave on meaningful changes
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    const t = setTimeout(() => { save(state) }, 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.name, state.layoutId, state.zones, state.durationSeconds])

  function selectLayout(layoutId: string) {
    setState((prev) => {
      const def = PREDEFINED_LAYOUTS.find((l) => l.id === layoutId)
      const validIds = new Set(def?.zones.map((z) => z.id) ?? [])
      // keep modules for zones that still exist in the new layout
      const keptZones: Record<string, ZoneModule> = {}
      for (const [zid, mod] of Object.entries(prev.zones)) {
        if (validIds.has(zid)) keptZones[zid] = mod
      }
      return {
        ...prev,
        layoutId,
        zones: keptZones,
        selectedZoneId: def?.zones[0]?.id ?? null,
      }
    })
    setPanelTab("zone")
  }

  function assignModule(mod: ModuleRow) {
    if (!state.selectedZoneId) return
    setState((prev) => ({
      ...prev,
      zones: { ...prev.zones, [prev.selectedZoneId!]: { moduleKey: mod.key, moduleName: mod.name, fields: {} } },
    }))
  }

  function updateField(key: string, value: unknown) {
    if (!state.selectedZoneId) return
    setState((prev) => {
      const zid = prev.selectedZoneId!
      const current = prev.zones[zid]
      if (!current) return prev
      return { ...prev, zones: { ...prev.zones, [zid]: { ...current, fields: { ...current.fields, [key]: value } } } }
    })
  }

  function clearZone() {
    if (!state.selectedZoneId) return
    setState((prev) => {
      const next = { ...prev.zones }
      delete next[prev.selectedZoneId!]
      return { ...prev, zones: next }
    })
  }

  const filteredModules = modules.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 h-12 bg-white border-b border-zinc-200 flex-shrink-0 shadow-sm">
        <a href="/admin/content" className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors flex-shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </a>
        <input
          type="text"
          value={state.name}
          onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
          className="text-sm font-semibold text-zinc-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-zinc-200 rounded px-2 py-1 min-w-[180px] max-w-xs"
          placeholder="Navn på innholdet..."
        />
        <div className="flex items-center gap-2 ml-auto">
          <SaveStatusIndicator status={state.saveStatus} />
          {state.contentItemId && (
            <a
              href={`/preview/${state.contentItemId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Fullskjerm
            </a>
          )}
          <BuilderPublishDialog
            contentItemId={state.contentItemId}
            onSaveFirst={() => save(state)}
            onPublished={() => {}}
          />
          <button
            onClick={() => save(state)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <Save className="w-3.5 h-3.5" />
            Lagre
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-80 flex-shrink-0 flex flex-col bg-white border-r border-zinc-100 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-zinc-100">
            <button
              onClick={() => setPanelTab("layout")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${panelTab === "layout" ? "text-zinc-900 border-b-2 border-zinc-900 -mb-px" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              Layout
            </button>
            <button
              onClick={() => setPanelTab("zone")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors ${panelTab === "zone" ? "text-zinc-900 border-b-2 border-zinc-900 -mb-px" : "text-zinc-400 hover:text-zinc-600"}`}
            >
              <Settings className="w-3.5 h-3.5" />
              Sone
              {selectedZone && <span className="text-[10px] text-zinc-400 font-normal">· {selectedZone.label}</span>}
            </button>
          </div>

          {panelTab === "layout" && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <p className="text-[11px] text-zinc-400 px-1 mb-1">Velg hvordan skjermen deles inn i soner:</p>
              {PREDEFINED_LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => selectLayout(l.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${state.layoutId === l.id ? "border-[var(--brand-primary)] bg-zinc-50" : "border-zinc-100 hover:border-zinc-300"}`}
                >
                  <div className="w-20 flex-shrink-0">
                    <LayoutThumbnail layoutId={l.id} active={state.layoutId === l.id} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-zinc-800">{l.name}</p>
                    <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{l.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {panelTab === "zone" && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {!selectedZone ? (
                <div className="flex flex-col items-center justify-center flex-1 text-zinc-400 px-4 text-center gap-3">
                  <Settings className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Klikk en sone i forhåndsvisningen for å fylle den med innhold</p>
                </div>
              ) : !selectedModule ? (
                <>
                  <div className="px-3 py-2.5 border-b border-zinc-100">
                    <p className="text-xs font-semibold text-zinc-800 mb-0.5">Sone: {selectedZone.label}</p>
                    <p className="text-[10px] text-zinc-400">Velg en modul som skal vises i denne sonen</p>
                    <div className="relative mt-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Søk modul..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full text-xs bg-zinc-50 border border-zinc-200 rounded-lg pl-7 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-zinc-300"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredModules.length === 0 && <p className="text-xs text-zinc-400 text-center py-6">Ingen moduler</p>}
                    {filteredModules.map((mod) => (
                      <button
                        key={mod.key}
                        onClick={() => assignModule(mod)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-zinc-100 hover:border-zinc-300 hover:bg-zinc-50 text-left transition-all group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0 group-hover:bg-zinc-200 transition-colors">
                          <Plus className="w-3.5 h-3.5 text-zinc-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-zinc-800 truncate">{mod.name}</p>
                          {mod.description && <p className="text-[10px] text-zinc-400 truncate">{mod.description}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
                    <div className="min-w-0">
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Sone: {selectedZone.label}</p>
                      <p className="text-sm font-semibold text-zinc-900 truncate">{selectedModule.moduleName}</p>
                    </div>
                    <button
                      onClick={clearZone}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors flex-shrink-0"
                      title="Fjern modul fra sonen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    {selectedModuleSchema ? (
                      <FieldRenderer schema={selectedModuleSchema} fields={selectedModule.fields} onChange={updateField} />
                    ) : (
                      <p className="text-sm text-zinc-400 italic">Ingen redigerbare felt for denne modulen.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Duration footer */}
          <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <label className="text-[11px] text-zinc-500">Visningstid</label>
            <input
              type="number"
              min={3}
              max={120}
              value={state.durationSeconds}
              onChange={(e) => setState((prev) => ({ ...prev, durationSeconds: Number(e.target.value) }))}
              className="w-16 text-xs border border-zinc-200 rounded-lg px-2 py-1 bg-white text-zinc-700 focus:outline-none ml-auto"
            />
            <span className="text-[11px] text-zinc-400">sek</span>
          </div>
        </div>

        {/* Preview = clickable canvas */}
        <div className="flex-1 flex flex-col items-center justify-center bg-zinc-800 p-6 overflow-hidden">
          <div className="w-full" style={{ maxWidth: "calc((100vh - 160px) * (16/9))" }}>
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <ScaledScreen>
                <ZoneLayoutRenderer layoutId={state.layoutId} zones={state.zones} showEmptyHints />
              </ScaledScreen>

              {/* Click targets over each zone */}
              {layout.zones.map((z) => (
                <button
                  key={z.id}
                  onClick={() => { setState((prev) => ({ ...prev, selectedZoneId: z.id })); setPanelTab("zone") }}
                  className={`absolute transition-all ${state.selectedZoneId === z.id ? "ring-2 ring-[var(--brand-primary)] ring-inset" : "hover:bg-white/5"}`}
                  style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
                  aria-label={`Velg sone ${z.label}`}
                />
              ))}
            </div>
            <p className="text-center text-zinc-400 text-[11px] mt-2">
              {layout.name} · {layout.zones.length} {layout.zones.length === 1 ? "sone" : "soner"} · {state.durationSeconds}s · klikk en sone for å fylle den
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
