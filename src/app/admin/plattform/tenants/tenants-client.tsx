"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import type { TenantRow } from "@/lib/admin/tenants"
import {
  createTenant,
  updateTenant,
  suspendTenant,
  reactivateTenant,
  archiveTenant,
} from "./actions"

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  active: { label: "Aktiv", className: "bg-emerald-100 text-emerald-700" },
  suspended: { label: "Suspendert", className: "bg-amber-100 text-amber-700" },
  archived: { label: "Arkivert", className: "bg-zinc-200 text-zinc-600" },
}

export function TenantsClient({ tenants }: { tenants: TenantRow[] }) {
  return (
    <div>
      <CreateTenantForm />
      <ul className="space-y-3">
        {tenants.map((t) => (
          <TenantCard key={t.id} tenant={t} />
        ))}
      </ul>
    </div>
  )
}

function CreateTenantForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const res = await createTenant({ name, slug, adminEmail })
    setBusy(false)
    if (!res.ok) {
      // Skjemaverdiene beholdes så feilen (f.eks. slug-konflikt) kan rettes.
      toast.error(res.error ?? "Kunne ikke opprette tenant")
      return
    }
    toast.success(`Tenant «${name.trim()}» opprettet — invitasjon sendt til ${adminEmail.trim()}`)
    setName("")
    setSlug("")
    setAdminEmail("")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900 mb-3">Ny tenant</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Navn</span>
          <input
            name="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Gange-Rolv AS"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Slug</span>
          <input
            name="slug"
            type="text"
            required
            pattern="[a-z0-9-]+"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="gange-rolv"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-zinc-500">Admin-e-post</span>
          <input
            name="adminEmail"
            type="email"
            required
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            placeholder="admin@kunde.no"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {busy ? "Oppretter…" : "Opprett tenant + inviter admin"}
      </button>
    </form>
  )
}

function TenantCard({ tenant }: { tenant: TenantRow }) {
  const router = useRouter()
  const badge = STATUS_BADGE[tenant.status] ?? STATUS_BADGE.active
  const [name, setName] = useState(tenant.name)
  const [busy, setBusy] = useState<null | "rename" | "suspend" | "reactivate" | "archive">(null)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)

  async function run(
    kind: "rename" | "suspend" | "reactivate" | "archive",
    fn: () => Promise<{ ok: boolean; error?: string | null }>,
    okMsg: string
  ) {
    setBusy(kind)
    const res = await fn()
    setBusy(null)
    if (!res.ok) {
      toast.error(res.error ?? "Noe gikk galt")
      return
    }
    toast.success(okMsg)
    router.refresh()
  }

  return (
    <li className="rounded-xl border border-zinc-100 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-zinc-900">{tenant.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          </div>
          <p className="truncate text-xs text-zinc-400">{tenant.slug}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tenant.status !== "archived" && (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label={`Nytt navn for ${tenant.name}`}
                className="w-40 rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              />
              <button
                type="button"
                disabled={busy !== null || name.trim() === tenant.name}
                onClick={() => run("rename", () => updateTenant(tenant.id, name), "Navn oppdatert")}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {busy === "rename" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Lagre
              </button>
            </div>
          )}

          {tenant.status === "active" && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setSuspendOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              {busy === "suspend" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Suspender
            </button>
          )}

          {tenant.status !== "active" && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run("reactivate", () => reactivateTenant(tenant.id), `«${tenant.name}» er reaktivert`)}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
            >
              {busy === "reactivate" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Reaktiver
            </button>
          )}

          {tenant.status !== "archived" && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setArchiveOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1 text-sm font-medium text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
            >
              {busy === "archive" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Arkiver
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        title={`Suspender «${tenant.name}»?`}
        description="Alle brukere i organisasjonen låses ute umiddelbart, og skjermene slutter å få nytt innhold. Du kan reaktivere når som helst."
        confirmLabel="Suspender"
        destructive
        onConfirm={() => run("suspend", () => suspendTenant(tenant.id), `«${tenant.name}» er suspendert`)}
      />
      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Arkiver «${tenant.name}»?`}
        description="Organisasjonen skjules og brukerne mister tilgangen. Data beholdes, og du kan reaktivere senere."
        confirmLabel="Arkiver"
        destructive
        onConfirm={() => run("archive", () => archiveTenant(tenant.id), `«${tenant.name}» er arkivert`)}
      />
    </li>
  )
}
