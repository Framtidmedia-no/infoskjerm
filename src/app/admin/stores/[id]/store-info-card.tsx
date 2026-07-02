"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Save, Trash2, TriangleAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import { updateStore, deleteStore } from "../actions"

export interface StoreInfo {
  id: string
  name: string
  company_name: string
  org_number: string
  gln: string
  email: string
  city: string
}

interface StoreInfoCardProps {
  store: StoreInfo
  showGln: boolean
  screenCount: number
  unitLabel: string
}

type FieldKey = "name" | "company_name" | "org_number" | "city" | "email" | "gln"

/**
 * Redigerbar butikkinformasjon + danger zone for sletting. Xibo-skjermene
 * kobles via butikknavnet (displayGroup === store.name), så navneendring
 * varsles eksplisitt.
 */
export function StoreInfoCard({ store, showGln, screenCount, unitLabel }: StoreInfoCardProps) {
  const router = useRouter()
  const [values, setValues] = useState({
    name: store.name,
    company_name: store.company_name,
    org_number: store.org_number,
    city: store.city,
    email: store.email,
    gln: store.gln,
  })
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const dirty =
    values.name !== store.name ||
    values.company_name !== store.company_name ||
    values.org_number !== store.org_number ||
    values.city !== store.city ||
    values.email !== store.email ||
    values.gln !== store.gln
  const nameChanged = values.name.trim() !== store.name

  function set(key: FieldKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate(): boolean {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!values.name.trim()) next.name = "Navn må fylles ut"
    if (!values.company_name.trim()) next.company_name = "Selskapsnavn må fylles ut"
    if (!/^\d{9}$/.test(values.org_number.replace(/\s/g, ""))) next.org_number = "Org.nr må være 9 sifre"
    if (!values.city.trim()) next.city = "By må fylles ut"
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "Ugyldig e-postadresse"
    const glnClean = values.gln.replace(/\s/g, "")
    if (showGln && glnClean && !/^\d{13}$/.test(glnClean)) next.gln = "GLN må være 13 sifre"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !dirty) return
    if (!validate()) return
    setSaving(true)
    const res = await updateStore(store.id, {
      name: values.name,
      company_name: values.company_name,
      org_number: values.org_number,
      gln: showGln ? values.gln : store.gln,
      email: values.email,
      city: values.city,
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error ?? "Kunne ikke lagre")
      return
    }
    toast.success("Butikkinformasjon lagret")
    router.refresh()
  }

  async function handleDelete() {
    const res = await deleteStore(store.id)
    if (!res.ok) {
      toast.error(res.error ?? "Kunne ikke slette enheten")
      return
    }
    toast.success(`«${store.name}» er slettet`)
    router.push("/admin/stores")
  }

  return (
    <Card>
      <CardContent className="p-5 space-y-4">
        <h2 className="font-semibold text-zinc-900">Butikkinformasjon</h2>

        <form onSubmit={handleSave} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`Navn på ${unitLabel.toLowerCase()}`} error={errors.name}>
              <Input value={values.name} onChange={(v) => set("name", v)} invalid={!!errors.name} />
            </Field>
            <Field label="Selskapsnavn" error={errors.company_name}>
              <Input value={values.company_name} onChange={(v) => set("company_name", v)} invalid={!!errors.company_name} />
            </Field>
            <Field label="Org.nr" error={errors.org_number}>
              <Input value={values.org_number} onChange={(v) => set("org_number", v)} inputMode="numeric" invalid={!!errors.org_number} mono />
            </Field>
            <Field label="By" error={errors.city}>
              <Input value={values.city} onChange={(v) => set("city", v)} invalid={!!errors.city} />
            </Field>
            <Field label="E-post" error={errors.email}>
              <Input value={values.email} onChange={(v) => set("email", v)} type="email" invalid={!!errors.email} />
            </Field>
            {showGln && (
              <Field label="GLN" error={errors.gln}>
                <Input value={values.gln} onChange={(v) => set("gln", v)} inputMode="numeric" invalid={!!errors.gln} mono />
              </Field>
            )}
          </div>

          {nameChanged && (
            <p className="flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Skjermene kobles til enheten via navnet. Endrer du navnet her, må skjermgruppen
              i skjermsystemet (Xibo) få samme nye navn — ellers forsvinner skjermene fra denne siden.
            </p>
          )}

          <div className="flex items-center justify-end border-t border-zinc-100 pt-3">
            <button
              type="submit"
              disabled={saving || !dirty}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Lagrer…" : "Lagre endringer"}
            </button>
          </div>
        </form>

        {/* Danger zone */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-red-800">Slett enhet</p>
            <p className="text-xs text-red-600/80">
              Fjerner enheten, tilganger og innholdsmålretting. Kan ikke angres.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Slett enhet
          </button>
        </div>

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={`Slett «${store.name}»?`}
          description={
            screenCount > 0
              ? `Enheten har ${screenCount} tilkoblet skjerm${screenCount === 1 ? "" : "er"} som slutter å få innhold. Brukertilganger og innholdsmålretting mot enheten fjernes også. Dette kan ikke angres.`
              : "Brukertilganger og innholdsmålretting mot enheten fjernes. Dette kan ikke angres."
          }
          confirmLabel="Slett enhet"
          destructive
          onConfirm={handleDelete}
        />
      </CardContent>
    </Card>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

function Input({
  value,
  onChange,
  type = "text",
  inputMode,
  invalid,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  type?: string
  inputMode?: "numeric"
  invalid?: boolean
  mono?: boolean
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      inputMode={inputMode}
      className={cn(
        "h-9 w-full rounded-lg border px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-zinc-900/10",
        mono && "font-mono",
        invalid ? "border-red-300" : "border-zinc-200 focus:border-zinc-300"
      )}
    />
  )
}
