"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { createStore } from "../actions"

interface ChainOption {
  id: string
  name: string
  color: string
}

interface NewStoreFormProps {
  chains: ChainOption[]
  showGln: boolean
  unitLabel: string
}

type FieldKey = "name" | "chain_id" | "company_name" | "org_number" | "city" | "email" | "gln"

export function NewStoreForm({ chains, showGln, unitLabel }: NewStoreFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({})

  const [name, setName] = useState("")
  const [chainId, setChainId] = useState(chains.length === 1 ? chains[0].id : "")
  const [companyName, setCompanyName] = useState("")
  const [orgNumber, setOrgNumber] = useState("")
  const [city, setCity] = useState("")
  const [email, setEmail] = useState("")
  const [gln, setGln] = useState("")

  function validate(): boolean {
    const next: Partial<Record<FieldKey, string>> = {}
    if (!name.trim()) next.name = "Navn må fylles ut"
    if (!chainId) next.chain_id = "Velg kjede"
    if (!companyName.trim()) next.company_name = "Selskapsnavn må fylles ut"
    const org = orgNumber.replace(/\s/g, "")
    if (!/^\d{9}$/.test(org)) next.org_number = "Org.nr må være 9 sifre"
    if (!city.trim()) next.city = "By må fylles ut"
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Ugyldig e-postadresse"
    const glnClean = gln.replace(/\s/g, "")
    if (showGln && glnClean && !/^\d{13}$/.test(glnClean)) next.gln = "GLN må være 13 sifre"
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    if (!validate()) return
    setSaving(true)
    const res = await createStore({
      name,
      company_name: companyName,
      org_number: orgNumber,
      gln: showGln ? gln : "",
      email,
      city,
      chain_id: chainId,
    })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error ?? "Kunne ikke opprette enheten")
      return
    }
    toast.success(`${unitLabel} «${name.trim()}» er lagt til`)
    router.push("/admin/stores")
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto w-full max-w-2xl">
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={`Navn på ${unitLabel.toLowerCase()}`} error={errors.name}>
              <Input
                value={name}
                onChange={setName}
                placeholder="F.eks. Gigant Trondheim"
                invalid={!!errors.name}
                autoFocus
              />
            </Field>

            <Field label="Kjede" error={errors.chain_id}>
              <select
                value={chainId}
                onChange={(e) => setChainId(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-lg border bg-white px-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-zinc-900/10",
                  errors.chain_id ? "border-red-300" : "border-zinc-200 focus:border-zinc-300"
                )}
              >
                <option value="">Velg kjede…</option>
                {chains.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Selskapsnavn" error={errors.company_name}>
              <Input
                value={companyName}
                onChange={setCompanyName}
                placeholder="F.eks. Gigant Trondheim AS"
                invalid={!!errors.company_name}
              />
            </Field>

            <Field label="Org.nr" error={errors.org_number}>
              <Input
                value={orgNumber}
                onChange={setOrgNumber}
                placeholder="9 sifre"
                inputMode="numeric"
                invalid={!!errors.org_number}
              />
            </Field>

            <Field label="By" error={errors.city}>
              <Input value={city} onChange={setCity} placeholder="F.eks. Trondheim" invalid={!!errors.city} />
            </Field>

            <Field label="E-post" error={errors.email}>
              <Input
                value={email}
                onChange={setEmail}
                placeholder="butikk@example.no"
                type="email"
                invalid={!!errors.email}
              />
            </Field>

            {showGln && (
              <Field label="GLN (valgfritt)" error={errors.gln}>
                <Input
                  value={gln}
                  onChange={setGln}
                  placeholder="13 sifre — la stå tomt om ukjent"
                  inputMode="numeric"
                  invalid={!!errors.gln}
                />
              </Field>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "Oppretter…" : `Legg til ${unitLabel.toLowerCase()}`}
            </button>
          </div>
        </CardContent>
      </Card>
    </form>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  invalid,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  inputMode?: "numeric"
  invalid?: boolean
  autoFocus?: boolean
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      inputMode={inputMode}
      autoFocus={autoFocus}
      className={cn(
        "h-10 w-full rounded-lg border px-3 text-sm outline-none transition-shadow placeholder:text-zinc-400 focus:ring-2 focus:ring-zinc-900/10",
        invalid ? "border-red-300" : "border-zinc-200 focus:border-zinc-300"
      )}
    />
  )
}
