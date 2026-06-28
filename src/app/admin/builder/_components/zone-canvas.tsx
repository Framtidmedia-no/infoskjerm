"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { ModulePlacement } from "@/lib/builder/types"
import { GripVertical, Trash2 } from "lucide-react"

interface ZoneCanvasProps {
  placements: ModulePlacement[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRemove: (id: string) => void
}

function SortablePlacementItem({
  placement,
  isSelected,
  onSelect,
  onRemove,
}: {
  placement: ModulePlacement
  isSelected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: placement.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`group flex items-center gap-2 bg-white rounded-xl border px-3 py-3 cursor-pointer select-none transition-all ${
        isSelected
          ? 'border-[var(--brand-primary)] shadow-sm ring-1 ring-[var(--brand-primary)]'
          : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500 flex-shrink-0"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800 truncate">{placement.moduleName}</p>
        <p className="text-[10px] text-zinc-400 font-mono">{placement.moduleKey} · {placement.durationSeconds}s</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-zinc-300 hover:text-red-500 transition-all flex-shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ZoneCanvas({ placements, selectedId, onSelect, onRemove }: ZoneCanvasProps) {
  const { isOver, setNodeRef } = useDroppable({ id: 'zone-canvas' })

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-zinc-100 bg-white">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Canvas</p>
        <p className="text-xs text-zinc-400 mt-0.5">{placements.length} modul{placements.length !== 1 ? 'er' : ''}</p>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-3 space-y-2 transition-colors ${
          isOver ? 'bg-blue-50' : 'bg-zinc-50'
        }`}
      >
        {placements.length === 0 && (
          <div className={`flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-xl transition-colors ${
            isOver ? 'border-blue-400 bg-blue-50/50' : 'border-zinc-200 bg-white'
          }`}>
            <p className="text-sm text-zinc-400">Slipp en modul her</p>
          </div>
        )}

        <SortableContext items={placements.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {placements.map((placement) => (
            <SortablePlacementItem
              key={placement.id}
              placement={placement}
              isSelected={selectedId === placement.id}
              onSelect={() => onSelect(placement.id)}
              onRemove={() => onRemove(placement.id)}
            />
          ))}
        </SortableContext>

        {placements.length > 0 && isOver && (
          <div className="h-10 border-2 border-dashed border-blue-400 rounded-xl bg-blue-50/50 flex items-center justify-center">
            <p className="text-xs text-blue-500">Slipp for å legge til</p>
          </div>
        )}
      </div>
    </div>
  )
}
