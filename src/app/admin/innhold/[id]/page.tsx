import { EditContentView } from "../_components/edit-content-view"

export const dynamic = "force-dynamic"

export default async function EditContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <EditContentView id={id} />
}
