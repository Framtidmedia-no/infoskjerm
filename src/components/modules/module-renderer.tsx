import { InternalNewsModule } from './internal-news'
import { EmergencyMessageModule } from './emergency-message'
import { ShiftScheduleModule } from './shift-schedule'
import { EmployeeSpotlightModule } from './employee-spotlight'
import { TrainingMaterialModule } from './training-material'
import { ProductOfferModule } from './product-offer'
import { CompetitionModule } from './competition'
import { SalesStatsModule } from './sales-stats'
import { WeatherModule } from './weather-module'
import { CompanyInfoModule } from './company-info'
import { LunchMenuModule } from './lunch-menu'
import { SlideModule } from './slide-module'

interface ModuleRendererProps {
  moduleKey: string
  fields: Record<string, unknown>
}

export function ModuleRenderer({ moduleKey, fields }: ModuleRendererProps) {
  switch (moduleKey) {
    case 'internal-news': return <InternalNewsModule fields={fields} />
    case 'emergency-message': return <EmergencyMessageModule fields={fields} />
    case 'shift-schedule': return <ShiftScheduleModule fields={fields} />
    case 'employee-spotlight': return <EmployeeSpotlightModule fields={fields} />
    case 'training-material': return <TrainingMaterialModule fields={fields} />
    case 'product-offer': return <ProductOfferModule fields={fields} />
    case 'competition': return <CompetitionModule fields={fields} />
    case 'sales-stats': return <SalesStatsModule fields={fields} />
    case 'weather': return <WeatherModule fields={fields} />
    case 'company-info': return <CompanyInfoModule fields={fields} />
    case 'lunch-menu': return <LunchMenuModule fields={fields} />
    case 'slide': return <SlideModule fields={fields} />
    default: return (
      <div className="flex items-center justify-center h-full text-zinc-400 text-2xl font-medium">
        Ukjent modul: {moduleKey}
      </div>
    )
  }
}
