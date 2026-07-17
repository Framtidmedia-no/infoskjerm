import { LegalPage, legalMetadata } from "../_components/legal-page"

export const revalidate = 300

export function generateMetadata() {
  return legalMetadata("personvern")
}

export default function PersonvernPage() {
  return <LegalPage slug="personvern" />
}
