// Legacy v1 — sekvensiell bildespillliste (én modul = én fullskjerm-slide)
export interface ModulePlacement {
  id: string
  moduleKey: string
  moduleName: string
  fields: Record<string, unknown>
  durationSeconds: number
}

export interface BuilderState {
  contentItemId: string | null
  name: string
  placements: ModulePlacement[]
  selectedId: string | null
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

// v2 — sammensatt skjerm: flere moduler i soner samtidig
export interface ZoneModule {
  moduleKey: string
  moduleName: string
  fields: Record<string, unknown>
}

export interface ZoneComposition {
  layoutId: string
  zones: Record<string, ZoneModule> // nøkkel = sone-id fra PREDEFINED_LAYOUTS
  durationSeconds: number
}

export interface BuilderV2State {
  contentItemId: string | null
  name: string
  layoutId: string
  zones: Record<string, ZoneModule>
  selectedZoneId: string | null
  durationSeconds: number
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
}

export interface ModuleSchema {
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'select' | 'image' | 'color' | 'date' | 'json' | 'richtext'
    required?: boolean
    options?: string[]
  }>
}
