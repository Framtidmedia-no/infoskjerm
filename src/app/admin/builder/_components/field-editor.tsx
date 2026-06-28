"use client"

import { X, Clock } from "lucide-react"
import { FieldRenderer } from "@/lib/builder/field-renderer"
import type { ModulePlacement, ModuleSchema } from "@/lib/builder/types"

interface FieldEditorProps {
  placement: ModulePlacement
  schema: ModuleSchema | null
  onUpdateField: (key: string, value: unknown) => void
  onUpdateDuration: (seconds: number) => void
  onClose: () => void
  onRemove: () => void
}

export function FieldEditor({ placement, schema, onUpdateField, onUpdateDuration, onClose, onRemove }: FieldEditorProps) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
        <div>
          <p className="text-sm font-semibold text-zinc-900">{placement.moduleName}</p>
          <p className="text-xs text-zinc-400 font-mono">{placement.moduleKey}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4">
        {schema ? (
          <FieldRenderer schema={schema} fields={placement.fields} onChange={onUpdateField} />
        ) : (
          <p className="text-sm text-zinc-400 italic">Ingen skjema tilgjengelig for denne modulen.</p>
        )}

        {/* Duration */}
        <div className="mt-6 pt-5 border-t border-zinc-100">
          <label className="block text-xs font-medium text-zinc-600 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Visningstid (sekunder)
          </label>
          <input
            type="number"
            min={3}
            max={120}
            value={placement.durationSeconds}
            onChange={(e) => onUpdateDuration(Number(e.target.value))}
            className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-zinc-100">
        <button
          onClick={onRemove}
          className="w-full text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg px-3 py-2 transition-colors"
        >
          Fjern modul
        </button>
      </div>
    </div>
  )
}
