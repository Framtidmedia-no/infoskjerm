"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { ConfirmDialog } from "@/components/admin/confirm-dialog"
import type { MarketingBlock, MarketingPrice } from "@/lib/marketing/content"
import {
  updateMarketingBlock,
  createMarketingPrice,
  updateMarketingPrice,
  deleteMarketingPrice,
} from "./actions"

const KIND_LABEL: Record<string, string> = {
  hero: "Hero (forsidetoppen)",
  fact: "Faktapunkt",
  stage: "Prosess-steg",
  hardware: "Skjerm-/hardwareblokk",
  pricing: "Pris-seksjonen (intro)",
  cta: "Kontakt-oppfordring",
  footer: "Footer-setning",
  seo: "SEO (tittel + beskrivelse)",
}

/** Hvilke extra-felter som redigeres per blokk-type. */
const EXTRA_FIELDS: Record<string, Array<{ key: string; label: string }>> = {
  hero: [
    { key: "meta_line", label: "Meta-linje (over overskriften)" },
    { key: "cta_label", label: "Knappetekst" },
    { key: "cta_url", label: "Knappelenke" },
    { key: "secondary_label", label: "Sekundærknapp tekst" },
    { key: "secondary_url", label: "Sekundærknapp lenke" },
    { key: "ticker_items", label: "Ticker-bånd (skill med ◆)" },
  ],
  pricing: [{ key: "footnote", label: "Fotnote under prisene" }],
  cta: [
    { key: "cta_label", label: "Knappetekst" },
    { key: "cta_url", label: "Knappelenke" },
  ],
}

const inputCls =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"

export function NettsideClient({
  blocks,
  prices,
}: {
  blocks: MarketingBlock[]
  prices: MarketingPrice[]
}) {
  return (
    <div className="space-y-8">
      <PriceEditor prices={prices} />
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900">Tekstblokker</h2>
        <div className="space-y-3">
          {blocks.map((block) => (
            <BlockCard key={block.id} block={block} />
          ))}
        </div>
      </section>
    </div>
  )
}

function BlockCard({ block }: { block: MarketingBlock }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState(block.title)
  const [body, setBody] = useState(block.body)
  const [extra, setExtra] = useState<Record<string, string>>(block.extra)
  const [busy, setBusy] = useState(false)
  const extraFields = EXTRA_FIELDS[block.kind] ?? []

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const res = await updateMarketingBlock({ id: block.id, title, body, extra })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error || "Kunne ikke lagre blokken")
      return
    }
    toast.success("Blokken er lagret")
    setOpen(false)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between gap-4 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-[11px] font-medium uppercase tracking-wide text-zinc-400">
            {KIND_LABEL[block.kind] ?? block.kind}
          </span>
          <span className="text-sm font-semibold text-zinc-900">
            {block.title.split("\n")[0] || "(uten tittel)"}
          </span>
        </span>
        <span className="text-xs font-semibold text-zinc-400">{open ? "Lukk" : "Rediger"}</span>
      </button>
      {open ? (
        <form onSubmit={handleSave} className="border-t border-zinc-100 px-4 py-4">
          <label className="block">
            <span className="text-xs font-medium text-zinc-500">
              Tittel{block.kind === "hero" ? " (én linje per display-linje)" : ""}
            </span>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={block.kind === "hero" ? 2 : 1}
              className={inputCls}
            />
          </label>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-zinc-500">
              {block.kind === "seo" ? "Meta-beskrivelse" : "Brødtekst"}
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </label>
          {extraFields.map((field) => (
            <label key={field.key} className="mt-3 block">
              <span className="text-xs font-medium text-zinc-500">{field.label}</span>
              <input
                type="text"
                value={extra[field.key] ?? ""}
                onChange={(e) => setExtra({ ...extra, [field.key]: e.target.value })}
                className={inputCls}
              />
            </label>
          ))}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lagre blokken
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}

interface PriceDraft {
  product: string
  period: string
  quantity_label: string
  price_nok: string
  unit: string
  sort_order: string
  active: boolean
}

function draftFrom(price?: MarketingPrice): PriceDraft {
  return {
    product: price?.product ?? "",
    period: price?.period ?? "Månedlig",
    quantity_label: price?.quantity_label ?? "alle",
    price_nok: price ? String(price.price_nok) : "",
    unit: price?.unit ?? "per skjerm",
    sort_order: String(price?.sort_order ?? 99),
    active: price?.active ?? true,
  }
}

function parseDraft(draft: PriceDraft) {
  return {
    product: draft.product,
    period: draft.period,
    quantity_label: draft.quantity_label,
    price_nok: Number(draft.price_nok),
    unit: draft.unit,
    sort_order: Number(draft.sort_order) || 0,
    active: draft.active,
  }
}

function PriceFields({
  draft,
  setDraft,
}: {
  draft: PriceDraft
  setDraft: (d: PriceDraft) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block sm:col-span-2">
        <span className="text-xs font-medium text-zinc-500">Produkt</span>
        <input
          type="text"
          required
          value={draft.product}
          onChange={(e) => setDraft({ ...draft, product: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Pris (kr)</span>
        <input
          type="number"
          required
          min={0}
          value={draft.price_nok}
          onChange={(e) => setDraft({ ...draft, price_nok: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Periode</span>
        <select
          value={draft.period}
          onChange={(e) => setDraft({ ...draft, period: e.target.value })}
          className={inputCls}
        >
          <option>Månedlig</option>
          <option>Engang</option>
        </select>
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Antall (f.eks. 1–4 skjermer)</span>
        <input
          type="text"
          value={draft.quantity_label}
          onChange={(e) => setDraft({ ...draft, quantity_label: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Enhet</span>
        <input
          type="text"
          value={draft.unit}
          onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-zinc-500">Rekkefølge</span>
        <input
          type="number"
          value={draft.sort_order}
          onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
          className={inputCls}
        />
      </label>
      <label className="flex items-center gap-2 pt-5 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Vises på siden
      </label>
    </div>
  )
}

function PriceEditor({ prices }: { prices: MarketingPrice[] }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<PriceDraft>(draftFrom())
  const [busy, setBusy] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const res = await createMarketingPrice(parseDraft(draft))
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error || "Kunne ikke legge til prisen")
      return
    }
    toast.success(`Prisen «${draft.product.trim()}» er lagt til`)
    setDraft(draftFrom())
    setCreating(false)
    router.refresh()
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900">Priser</h2>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
        >
          <Plus className="h-4 w-4" />
          Ny pris
        </button>
      </div>
      {creating ? (
        <form
          onSubmit={handleCreate}
          className="mb-4 rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
        >
          <PriceFields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Legg til prisen
            </button>
          </div>
        </form>
      ) : null}
      <ul className="space-y-3">
        {prices.map((price) => (
          <PriceCard key={price.id} price={price} />
        ))}
      </ul>
    </section>
  )
}

function PriceCard({ price }: { price: MarketingPrice }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [draft, setDraft] = useState<PriceDraft>(draftFrom(price))
  const [busy, setBusy] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    const res = await updateMarketingPrice(price.id, parseDraft(draft))
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error || "Kunne ikke lagre prisen")
      return
    }
    toast.success(`Prisen «${draft.product.trim()}» er lagret`)
    setOpen(false)
    router.refresh()
  }

  async function handleDelete() {
    const res = await deleteMarketingPrice(price.id)
    if (!res.ok) {
      toast.error(res.error || "Kunne ikke slette prisen")
      return
    }
    toast.success(`Prisen «${price.product}» er slettet`)
    router.refresh()
  }

  return (
    <li className="rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex-1 text-left"
        >
          <span className="text-sm font-semibold text-zinc-900">
            {price.product}
            {!price.active ? (
              <span className="ml-2 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                Skjult
              </span>
            ) : null}
          </span>
          <span className="block text-xs text-zinc-500">
            {price.period} · {price.quantity_label} ·{" "}
            {new Intl.NumberFormat("nb-NO").format(price.price_nok)} kr {price.unit}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          title={`Slett prisen «${price.product}»`}
          className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {open ? (
        <form onSubmit={handleSave} className="border-t border-zinc-100 px-4 py-4">
          <PriceFields draft={draft} setDraft={setDraft} />
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Lagre prisen
            </button>
          </div>
        </form>
      ) : null}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Slette «${price.product}»?`}
        description="Prisen fjernes fra den offentlige siden med en gang. Dette kan ikke angres."
        confirmLabel="Slett prisen"
        destructive
        onConfirm={handleDelete}
      />
    </li>
  )
}
