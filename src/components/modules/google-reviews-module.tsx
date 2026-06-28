import { Star } from 'lucide-react'
interface Props { fields: Record<string, unknown> }
export function GoogleReviewsModule({ fields }: Props) {
  const businessName = fields.business_name as string | null

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-8 gap-4">
      <div className="text-4xl">⭐</div>
      <p className="text-xl font-semibold">{businessName ?? "Google Anmeldelser"}</p>
      <p className="text-gray-400 text-sm text-center">
        Google Reviews-integrasjon ikke konfigurert.<br/>
        Koble til Google Business API for å vise ekte anmeldelser.
      </p>
    </div>
  )
}
