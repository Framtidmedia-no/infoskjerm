import { AlertTriangle } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
const severityColors: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', critical: '#ef4444' }
export function EmergencyMessageModule({ fields }: Props) {
  const title = (fields.title as string) || 'Viktig beskjed'
  const message = (fields.message as string) || 'Ingen melding.'
  const severity = (fields.severity as string) || 'warning'
  const color = severityColors[severity] || severityColors.warning
  return (
    <div className="flex flex-col items-center justify-center h-full px-20 text-white text-center" style={{ background: `linear-gradient(135deg, ${color}22, ${color}11)` }}>
      <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-8" style={{ backgroundColor: color + '33', border: `2px solid ${color}` }}>
        <AlertTriangle className="w-12 h-12" style={{ color }} />
      </div>
      <h2 className="text-5xl font-black mb-6" style={{ color }}>{title}</h2>
      <p className="text-2xl text-zinc-200 leading-relaxed max-w-2xl">{message}</p>
    </div>
  )
}
