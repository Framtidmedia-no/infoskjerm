import { Topbar } from "@/components/admin/topbar"
import { loadPlanData } from "./plan-data"
import { PlanClient } from "./plan-client"

export const dynamic = "force-dynamic"

export default async function PlanPage() {
  const data = await loadPlanData()
  return (
    <>
      <Topbar title="Planen" subtitle="Hva som vises når — kundeskjerm og internskjerm" />
      <PlanClient data={data} />
    </>
  )
}
