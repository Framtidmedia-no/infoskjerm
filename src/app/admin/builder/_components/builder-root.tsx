"use client"

import { useState, useCallback } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { ModulePalette } from "./module-palette"
import { ZoneCanvas } from "./zone-canvas"
import { LivePreview } from "./live-preview"
import { FieldEditor } from "./field-editor"
import { useAutosave } from "@/lib/builder/autosave"
import { createClient } from "@/lib/supabase/client"
import type { ModulePlacement, BuilderState, ModuleSchema } from "@/lib/builder/types"
import type { Json } from "@/types/database"
import type { ModuleRow } from "@/lib/admin/modules"
import { Save, CheckCircle, AlertCircle, Loader2 } from "lucide-react"

interface BuilderRootProps {
  modules: ModuleRow[]
  tenantId: string
  userId: string
  initialName?: string
  initialContentItemId?: string | null
  initialPlacements?: ModulePlacement[]
}

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function SaveStatusIndicator({ status }: { status: BuilderState['saveStatus'] }) {
  if (status === 'idle') return null
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {status === 'saving' && <><Loader2 className="w-3 h-3 animate-spin text-zinc-400" /><span className="text-zinc-400">Lagrer...</span></>}
      {status === 'saved' && <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-emerald-600">Lagret</span></>}
      {status === 'error' && <><AlertCircle className="w-3 h-3 text-red-500" /><span className="text-red-600">Feil ved lagring</span></>}
    </div>
  )
}

export function BuilderRoot({ modules, tenantId, userId, initialName = 'Nytt innhold', initialContentItemId = null, initialPlacements = [] }: BuilderRootProps) {
  const supabase = createClient()

  const [state, setState] = useState<BuilderState>({
    contentItemId: initialContentItemId,
    name: initialName,
    placements: initialPlacements,
    selectedId: null,
    saveStatus: 'idle',
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleSaved = useCallback((id: string) => {
    setState((prev) => ({ ...prev, contentItemId: id }))
  }, [])

  const handleStatus = useCallback((status: BuilderState['saveStatus']) => {
    setState((prev) => ({ ...prev, saveStatus: status }))
  }, [])

  useAutosave(supabase, state.name, state.placements, tenantId, userId, state.contentItemId, handleSaved, handleStatus)

  const selectedPlacement = state.placements.find((p) => p.id === state.selectedId) ?? null

  const selectedModuleSchema: ModuleSchema | null = (() => {
    if (!selectedPlacement) return null
    const mod = modules.find((m) => m.key === selectedPlacement.moduleKey)
    if (!mod) return null
    try {
      return (mod.schema as unknown as ModuleSchema)
    } catch {
      return null
    }
  })()

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)

    // From palette to canvas
    if (activeId.startsWith('palette-')) {
      const moduleKey = activeId.replace('palette-', '')
      const mod = modules.find((m) => m.key === moduleKey)
      if (!mod) return
      const newPlacement: ModulePlacement = {
        id: genId(),
        moduleKey,
        moduleName: mod.name,
        fields: {},
        durationSeconds: 10,
      }
      setState((prev) => ({
        ...prev,
        placements: [...prev.placements, newPlacement],
        selectedId: newPlacement.id,
      }))
      return
    }

    // Reorder within canvas
    if (over.id !== activeId) {
      setState((prev) => {
        const oldIndex = prev.placements.findIndex((p) => p.id === activeId)
        const newIndex = prev.placements.findIndex((p) => p.id === String(over.id))
        if (oldIndex === -1 || newIndex === -1) return prev
        return { ...prev, placements: arrayMove(prev.placements, oldIndex, newIndex) }
      })
    }
  }

  function updateField(key: string, value: unknown) {
    if (!state.selectedId) return
    setState((prev) => ({
      ...prev,
      placements: prev.placements.map((p) =>
        p.id === prev.selectedId ? { ...p, fields: { ...p.fields, [key]: value } } : p
      ),
    }))
  }

  function updateDuration(seconds: number) {
    if (!state.selectedId) return
    setState((prev) => ({
      ...prev,
      placements: prev.placements.map((p) =>
        p.id === prev.selectedId ? { ...p, durationSeconds: seconds } : p
      ),
    }))
  }

  function removePlacement(id: string) {
    setState((prev) => ({
      ...prev,
      placements: prev.placements.filter((p) => p.id !== id),
      selectedId: prev.selectedId === id ? null : prev.selectedId,
    }))
  }

  const handleManualSave = async () => {
    handleStatus('saving')
    try {
      const body = JSON.parse(JSON.stringify({ builder_v1: { placements: state.placements } })) as Json
      if (state.contentItemId) {
        await supabase
          .from('content_items')
          .update({ title: state.name, body, updated_at: new Date().toISOString() })
          .eq('id', state.contentItemId)
      } else {
        const { data } = await supabase
          .from('content_items')
          .insert({ title: state.name, body, type: 'slide', status: 'draft', tenant_id: tenantId, created_by: userId })
          .select('id')
          .single()
        if (data) handleSaved(data.id)
      }
      handleStatus('saved')
    } catch {
      handleStatus('error')
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Builder toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-b border-zinc-100 shadow-sm flex-shrink-0">
        <input
          type="text"
          value={state.name}
          onChange={(e) => setState((prev) => ({ ...prev, name: e.target.value }))}
          className="text-sm font-semibold text-zinc-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-zinc-200 rounded px-2 py-1 min-w-[200px]"
          placeholder="Navn på innholdet..."
        />
        <div className="ml-auto flex items-center gap-3">
          <SaveStatusIndicator status={state.saveStatus} />
          <button
            onClick={handleManualSave}
            className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            <Save className="w-3.5 h-3.5" />
            Lagre utkast
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Module palette */}
          <div className="w-52 flex-shrink-0 overflow-hidden">
            <ModulePalette modules={modules} />
          </div>

          {/* Center: Zone canvas */}
          <div className="w-64 flex-shrink-0 overflow-hidden border-x border-zinc-100">
            <ZoneCanvas
              placements={state.placements}
              selectedId={state.selectedId}
              onSelect={(id) => setState((prev) => ({ ...prev, selectedId: id }))}
              onRemove={removePlacement}
            />
          </div>

          {/* Right: Preview + Field editor */}
          <div className="flex flex-1 overflow-hidden">
            {/* Live preview */}
            <div className="flex-1 overflow-hidden">
              <LivePreview placements={state.placements} />
            </div>

            {/* Field editor (slide-in when selected) */}
            {selectedPlacement && (
              <div className="w-72 flex-shrink-0 overflow-hidden border-l border-zinc-100">
                <FieldEditor
                  placement={selectedPlacement}
                  schema={selectedModuleSchema}
                  onUpdateField={updateField}
                  onUpdateDuration={updateDuration}
                  onClose={() => setState((prev) => ({ ...prev, selectedId: null }))}
                  onRemove={() => removePlacement(selectedPlacement.id)}
                />
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {/* Render a ghost while dragging from palette */}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
