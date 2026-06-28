import type { ModuleSchema } from './types'

interface FieldRendererProps {
  schema: ModuleSchema
  fields: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

export function FieldRenderer({ schema, fields, onChange }: FieldRendererProps) {
  return (
    <div className="space-y-4">
      {schema.fields.map((field) => {
        const value = (fields[field.key] as string | number) ?? ''
        const inputClass = "w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:border-transparent bg-white text-zinc-900"

        if (field.type === 'select') {
          return (
            <div key={field.key}>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <select
                value={value as string}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={inputClass}
                style={{ '--tw-ring-color': 'var(--brand-primary)' } as React.CSSProperties}
              >
                <option value="">Velg...</option>
                {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          )
        }

        if (field.type === 'textarea' || field.type === 'richtext' || field.type === 'json') {
          return (
            <div key={field.key}>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              <textarea
                value={value as string}
                onChange={(e) => onChange(field.key, e.target.value)}
                rows={field.type === 'json' ? 4 : 3}
                className={`${inputClass} resize-none font-${field.type === 'json' ? 'mono text-xs' : 'sans'}`}
                placeholder={field.type === 'json' ? '[]' : ''}
              />
            </div>
          )
        }

        return (
          <div key={field.key}>
            <label className="block text-xs font-medium text-zinc-600 mb-1">
              {field.label}{field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type === 'number' ? 'number' : field.type === 'color' ? 'color' : field.type === 'date' ? 'date' : 'text'}
              value={value as string}
              onChange={(e) => onChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
              className={inputClass}
            />
          </div>
        )
      })}
    </div>
  )
}
