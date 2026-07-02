import { requireRole } from "@/lib/admin/require-role"
import { loadContentForAudience } from "@/app/admin/innhold/content-data"

/**
 * Datagrunnlag for «Planen» — tidslinjen over alt planlagt innhold per flate.
 * Gjenbruker loadContentForAudience (samme rolle-synlighet som innholdslistene)
 * og beriker invitasjoner med arrangementsdato/påmeldingsfrist fra body.
 * Elementer uten gyldighetsvindu er «kontinuerlige» (åpen start/slutt).
 */

export interface PlanItem {
  id: string
  title: string
  type: string
  status: string | null
  imageUrl: string | null
  /** ISO-dato eller null = åpen start (kontinuerlig fra publisering). */
  start: string | null
  /** ISO-dato eller null = åpen slutt. */
  end: string | null
  /** Vises i begge baner når audience er «begge». */
  inBothLanes: boolean
  targetLabel: string
  eventDate: string | null
  signupDeadline: string | null
  editHref: string
}

export interface PlanData {
  kunde: PlanItem[]
  intern: PlanItem[]
}

interface InvitationBody {
  invitation?: { eventDate?: string | null; signupDeadline?: string | null }
}

const AUTHOR_ROLES = ["super_admin", "chain_manager", "area_manager", "store_manager", "store_employee"] as const

export async function loadPlanData(): Promise<PlanData> {
  const [{ rows: kundeRows }, { rows: internRows }] = await Promise.all([
    loadContentForAudience("kunde"),
    loadContentForAudience("intern"),
  ])

  // Invitasjoner: hent arrangementsdato/frist fra body i én ekstra spørring.
  const invitationIds = [...kundeRows, ...internRows].filter((r) => r.type === "invitation").map((r) => r.id)
  const invitationInfo = new Map<string, { eventDate: string | null; signupDeadline: string | null }>()
  if (invitationIds.length > 0) {
    const { supabase } = await requireRole([...AUTHOR_ROLES])
    const { data } = await supabase.from("content_items").select("id, body").in("id", invitationIds)
    for (const row of data ?? []) {
      const inv = ((row.body ?? {}) as InvitationBody).invitation ?? {}
      invitationInfo.set(row.id, {
        eventDate: inv.eventDate ?? null,
        signupDeadline: inv.signupDeadline ?? null,
      })
    }
  }

  const kundeIds = new Set(kundeRows.map((r) => r.id))
  const internIds = new Set(internRows.map((r) => r.id))

  type Row = (typeof kundeRows)[number]
  const toItem = (row: Row, lane: "kunde" | "intern"): PlanItem => {
    const inv = invitationInfo.get(row.id)
    const editHref =
      row.type === "invitation"
        ? `/admin/invitasjoner/${row.id}`
        : lane === "kunde"
          ? `/admin/kundeinnhold/${row.id}`
          : `/admin/innhold/${row.id}`
    const targetLabel =
      row.target.mode === "all"
        ? "Alle"
        : row.target.names.length > 0
          ? row.target.names.join(", ")
          : "—"
    return {
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      imageUrl: row.imageUrl,
      start: row.validFrom,
      end: row.validTo,
      inBothLanes: kundeIds.has(row.id) && internIds.has(row.id),
      targetLabel,
      eventDate: inv?.eventDate ?? null,
      signupDeadline: inv?.signupDeadline ?? null,
      editHref,
    }
  }

  const sortItems = (a: PlanItem, b: PlanItem) => {
    // Kontinuerlige (åpen start) øverst, deretter etter startdato.
    if (!a.start !== !b.start) return a.start ? 1 : -1
    if (a.start && b.start && a.start !== b.start) return a.start.localeCompare(b.start)
    return a.title.localeCompare(b.title, "nb")
  }

  return {
    kunde: kundeRows.map((r) => toItem(r, "kunde")).sort(sortItems),
    intern: internRows.map((r) => toItem(r, "intern")).sort(sortItems),
  }
}
