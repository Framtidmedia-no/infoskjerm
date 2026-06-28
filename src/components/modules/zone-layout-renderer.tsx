import { PREDEFINED_LAYOUTS } from "@/lib/zones/predefined-layouts"
import { ModuleRenderer } from "./module-renderer"
import type { ZoneModule } from "@/lib/builder/types"

interface ZoneLayoutRendererProps {
  layoutId: string
  zones: Record<string, ZoneModule>
  /** When true, empty zones show their label as a placeholder (builder only). */
  showEmptyHints?: boolean
}

/**
 * Renders a single composed screen: a predefined layout's zones positioned by
 * percentage, each holding one module. All zones are visible at once — this is
 * the multi-module-per-screen view (news + weather + clock side by side, etc.).
 *
 * Each zone establishes a `container-type: size` context so modules that use
 * container-query units (cqw/cqh) scale to the zone, not the full viewport.
 */
export function ZoneLayoutRenderer({ layoutId, zones, showEmptyHints = false }: ZoneLayoutRendererProps) {
  const layout = PREDEFINED_LAYOUTS.find((l) => l.id === layoutId) ?? PREDEFINED_LAYOUTS[0]

  return (
    <div className="relative w-full h-full bg-black">
      {layout.zones.map((z) => {
        const mod = zones[z.id]
        return (
          <div
            key={z.id}
            className="absolute overflow-hidden"
            style={{
              left: `${z.x}%`,
              top: `${z.y}%`,
              width: `${z.w}%`,
              height: `${z.h}%`,
              containerType: "size",
            }}
          >
            {mod ? (
              <ModuleRenderer moduleKey={mod.moduleKey} fields={mod.fields} />
            ) : showEmptyHints ? (
              <div className="flex flex-col items-center justify-center w-full h-full bg-zinc-900/80 border border-dashed border-zinc-700 text-zinc-500 gap-2">
                <span className="text-3xl font-semibold">{z.label}</span>
                <span className="text-base text-zinc-600">Klikk for å velge modul</span>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
