import { CloudSun, Wind, Droplets } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function WeatherModule({ fields }: Props) {
  const locationName = (fields.location_name as string) || 'Stedet'
  return (
    <div className="flex flex-col justify-center h-full px-20 text-white">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
          <CloudSun className="w-7 h-7 text-sky-400" />
        </div>
        <span className="text-sky-400 font-semibold text-lg uppercase tracking-widest">Vær — {locationName}</span>
      </div>
      <div className="flex items-end gap-8 mb-6">
        <p className="text-9xl font-black">--°</p>
        <div className="pb-4">
          <p className="text-2xl text-zinc-300 mb-3">Oppdateres automatisk</p>
          <div className="flex gap-6 text-zinc-400">
            <div className="flex items-center gap-2"><Wind className="w-4 h-4" /><span>-- m/s</span></div>
            <div className="flex items-center gap-2"><Droplets className="w-4 h-4" /><span>--%</span></div>
          </div>
        </div>
      </div>
      <p className="text-zinc-500 text-lg">Koordinater: lat={fields.lat as number ?? '--'}, lon={fields.lon as number ?? '--'}</p>
    </div>
  )
}
