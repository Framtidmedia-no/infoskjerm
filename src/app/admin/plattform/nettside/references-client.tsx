"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Copy, Check, Lock } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import type { AdminReference } from "@/lib/marketing/references"
import {
  updateReference,
  createReference,
  setReferencePublished,
  deleteReference,
  type ReferenceInput,
} from "./reference-actions"

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"

const BASE_URL =
  typeof window !== "undefined" ? window.location.origin : "https://infoskjerm.framtidtech.no"

interface Draft {
  company_name: string
  quote: string
  contact_name: string
  contact_role: string
  logo_url: string
  screenshot_url: string
  sort_order: string
}

function draftFrom(ref?: AdminReference): Draft {
  return {
    company_name: ref?.company_name ?? "",
    quote: ref?.quote ?? "",
    contact_name: ref?.contact_name ?? "",
    contact_role: ref?.contact_role ?? "",
    logo_url: ref?.logo_url ?? "",
    screenshot_url: ref?.screenshot_url ?? "",
    sort_order: String(ref?.sort_order ?? 99),
  }
}

function parseDraft(d: Draft): ReferenceInput {
  return {
    company_name: d.company_name,
    quote: d.quote,
    contact_name: d.contact_name,
    contact_role: d.contact_role,
    logo_url: d.logo_url,
    screenshot_url: d.screenshot_url,
    sort_order: Number(d.sort_order) || 0,
  }
}

function Fields({ draft, setDraft }: { draft: Draft; setDraft: (d: Draft) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-zinc-500">Firmanavn *</span>
        <input value={draft.company_name} onChange={(e) => setDraft({ ...draft, company_name: e.target.value })} className={inputCls} />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-zinc-500">Sitat</span>
        <textarea rows={3} value={draft.quote} onChange={(e) => setDraft({ ...draft, quote: e.target.value })} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Kontaktperson</span>
        <input value={draft.contact_name} onChange={(e) => setDraft({ ...draft, contact_name: e.target.value })} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Rolle</span>
        <input value={draft.contact_role} onChange={(e) => setDraft({ ...draft, contact_role: e.target.value })} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Logo-URL (media-bucket)</span>
        <input value={draft.logo_url} onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Skjermbilde-URL (media-bucket)</span>
        <input value={draft.screenshot_url} onChange={(e) => setDraft({ ...draft, screenshot_url: e.target.value })} className={inputCls} />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Rekkefølge</span>
        <input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} className={inputCls} />
      </label>
    </div>
  )
}

export function ReferencesClient({ references }: { references: AdminReference[] }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(draftFrom())
  const [busy, setBusy] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const res = await createReference(parseDraft(draft))
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`Referansen «${draft.company_name.trim()}» er opprettet`)
    setDraft(draftFrom())
    setCreating(false)
    router.refresh()
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Kundereferanser</h2>
          <p className="text-xs text-zinc-500">
            Referanser vises kun offentlig etter at kunden har signert samtykke via lenken.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <Plus className="h-4 w-4" />
          Ny referanse
        </button>
      </div>
      {creating ? (
        <form onSubmit={handleCreate} className="mb-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <Fields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Opprett referanse
            </button>
          </div>
        </form>
      ) : null}
      <ul className="space-y-3">
        {references.map((ref) => (
          <ReferenceCard key={ref.id} reference={ref} />
        ))}
      </ul>
    </section>
  )
}

function ReferenceCard({ reference }: { reference: AdminReference }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState<Draft>(draftFrom(reference))
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const consentUrl = `${BASE_URL}/referanse-samtykke/${reference.consent_token}`
  const hasConsent = Boolean(reference.consented_at)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const res = await updateReference(reference.id, parseDraft(draft))
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Referansen er lagret")
    setOpen(false)
    router.refresh()
  }

  async function togglePublished() {
    const res = await setReferencePublished(reference.id, !reference.published)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(reference.published ? "Referansen er avpublisert" : "Referansen er publisert")
    router.refresh()
  }

  async function copyLink() {
    await navigator.clipboard.writeText(consentUrl)
    setCopied(true)
    toast.success("Samtykke-lenke kopiert — send den til kunden")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    const res = await deleteReference(reference.id)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Referansen er slettet")
    router.refresh()
  }

  return (
    <li className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex-1 text-left">
          <span className="text-sm font-semibold text-zinc-900">{reference.company_name || "(uten navn)"}</span>
          <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-medium">
            {reference.published ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">Publisert</span>
            ) : (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-zinc-500">Skjult</span>
            )}
            {hasConsent ? (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                Samtykke signert{reference.consented_by_name ? ` · ${reference.consented_by_name}` : ""}
              </span>
            ) : (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">Venter på samtykke</span>
            )}
          </span>
        </button>
        <button type="button" onClick={() => setConfirmDelete(true)} title="Slett referansen" className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="border-t border-zinc-100 px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copyLink} className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Kopier samtykke-lenke
          </button>
          <button
            type="button"
            onClick={togglePublished}
            disabled={!hasConsent && !reference.published}
            title={!hasConsent && !reference.published ? "Kan ikke publiseres før samtykke er signert" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${
              reference.published
                ? "bg-zinc-900 text-white hover:bg-zinc-700"
                : hasConsent
                  ? "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "cursor-not-allowed border border-zinc-200 bg-zinc-50 text-zinc-400"
            }`}
          >
            {!hasConsent && !reference.published ? <Lock className="h-3.5 w-3.5" /> : null}
            {reference.published ? "Avpubliser" : "Publiser"}
          </button>
        </div>
      </div>

      {open ? (
        <form onSubmit={handleSave} className="border-t border-zinc-100 px-4 py-4">
          <Fields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex justify-end">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lagre referansen
            </button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Slette «${reference.company_name}»?`}
        description="Referansen og det loggede samtykket slettes. Dette kan ikke angres."
        confirmLabel="Slett referansen"
        destructive
        onConfirm={handleDelete}
      />
    </li>
  )
}
