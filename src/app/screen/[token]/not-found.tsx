import { ShieldX } from "lucide-react"

export default function ScreenNotFound() {
  return (
    <div className="h-screen w-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-950 flex items-center justify-center mx-auto mb-4">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-white text-xl font-bold">Ugyldig skjerm-token</p>
        <p className="text-zinc-500 text-sm mt-2">Denne skjermen er ikke registrert eller har blitt deaktivert.</p>
        <p className="text-zinc-600 text-xs mt-4">Kontakt administrator for å få tildelt en ny URL.</p>
      </div>
    </div>
  )
}
