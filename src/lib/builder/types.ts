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

export interface ModuleSchema {
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'textarea' | 'number' | 'select' | 'image' | 'color' | 'date' | 'json' | 'richtext'
    required?: boolean
    options?: string[]
  }>
}
