"use client"

import { useState, useId } from "react"
import { Code2, X, Loader2, Upload, Copy, Check, Sparkles } from "lucide-react"
import { toast } from "sonner"

/**
 * HTML-innholdstype: to opplastingsslots (liggende + stående). Brukeren lager en
 * selvstendig HTML-side (gjerne med Claude/ChatGPT — se startprompten under),
 * laster den opp, og den saneres server-side FØR den lagres. På skjermen vises
 * den i en låst sandbox-iframe (ingen JavaScript kjøres) — CSS-animasjon kjører.
 *
 * Minst én slot må fylles; mangler én, vises den andre på begge orienteringer.
 */

const MAX_BYTES = 1_600_000

// Startprompt brukeren kan kopiere rett inn i Claude/ChatGPT. Matcher det
// saneringen tillater (ingen JS, selvstendig fil, begge orienteringer).
const STARTER_PROMPT = `Du skal lage innhold til en digital infoskjerm (digital signage). Jeg er ikke
utvikler, så gi meg ferdige, komplette filer jeg bare kan laste ned og bruke.

LAG TO SEPARATE HTML-FILER:
  FIL 1 — LIGGENDE: designflate nøyaktig 1920 × 1080 piksler (16:9, på tvers).
  FIL 2 — STÅENDE:  designflate nøyaktig 1080 × 1920 piksler (9:16, på høykant).
Samme budskap og stil i begge, men komponer layouten på nytt så den passer hver
retning (ikke bare strekk den ene).

INNHOLD:
- Butikk/avsender: [BUTIKK]
- Hovedbudskap (det ENE folk skal lese på avstand): [BUDSKAP]
- Ev. pris eller nøkkeltall som skal være stort: [PRIS]
- Farger / merkevare: [FARGER]  (f.eks. «mørk bakgrunn, gull aksent»)
- Stemning/stil: [STIL]  (f.eks. elegant, leken, minimalistisk, premium)

HARDE TEKNISKE KRAV — MÅ følges nøyaktig, ellers virker det ikke hos oss:
1. ÉN selvstendig .html-fil per retning. ALT inne i fila: CSS i en <style>-blokk,
   ev. bilder/logo som data:-URI (base64). INGEN <link>, INGEN Google Fonts/CDN,
   INGEN eksterne bilder. Bruk web-trygge systemfonter (Arial, Georgia, system-ui).
2. INGEN JavaScript — det kjøres aldri (låst sandkasse). ALL bevegelse er ren CSS
   (@keyframes, animation, transition, transform). La animasjonen loope rolig og
   sømløst; ingen harde blink/stroboskop.
3. Fyll HELE flaten. <body> uten marg/scrollbar, overflow: hidden, ingen hvite kanter.
4. STOR, lesbar typografi (ses på flere meters avstand). Sterk kontrast. Ett
   dominerende budskap.
5. TRYGG MARG: hold viktig tekst/logo minst 6–8 % inn fra hver kant (TV-er kan beskjære).
6. Under ca. 1,5 MB per fil. Bruk helst CSS-gradienter i stedet for fotobakgrunner.

LEVER: hver fil som én komplett kodeblokk (start med <!doctype html>), tydelig merket
«LIGGENDE (1920×1080)» og «STÅENDE (1080×1920)». Lag noe råflott og profesjonelt.`

async function uploadHtml(file: File): Promise<string> {
  const text = await file.text()
  const res = await fetch("/api/admin/innhold/html-sanitize", {
    method: "POST",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: text,
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error ?? "Opplasting feilet")
  return data.url
}

function Slot({ label, hint, url, onChange, ratio }: {
  label: string
  hint: string
  url: string | null
  onChange: (url: string | null) => void
  ratio: string
}) {
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputId = useId()

  async function handleFile(file?: File | null) {
    if (!file) return
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      toast.error("Velg en .html-fil.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Fila er ${(file.size / 1024 / 1024).toFixed(1)} MB — maks 1,5 MB. Komprimer bilder eller bruk CSS-gradienter.`)
      return
    }
    setBusy(true)
    try {
      onChange(await uploadHtml(file))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Opplasting feilet")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
      <div>
        <span className="text-[11px] font-semibold text-zinc-700">{label}</span>
        <p className="text-[10px] text-zinc-400">{hint}</p>
      </div>
      {url ? (
        <div className="relative rounded-xl overflow-hidden border border-zinc-200 group bg-black" style={{ aspectRatio: ratio }}>
          <iframe src={url} title={`Forhåndsvisning ${label}`} sandbox="" scrolling="no"
            className="absolute inset-0 w-full h-full border-0 pointer-events-none" />
          <button type="button" onClick={() => onChange(null)} aria-label="Fjern fil"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <label htmlFor={inputId}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all text-center px-4 ${dragging ? "border-zinc-900 bg-white" : "border-zinc-300 bg-white hover:border-zinc-400"}`}
          style={{ aspectRatio: ratio }}>
          <input id={inputId} type="file" accept=".html,text/html" className="hidden"
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = "" }} disabled={busy} />
          {busy ? (
            <><Loader2 className="w-5 h-5 text-zinc-500 animate-spin" /><span className="text-[11px] text-zinc-500">Saniterer og laster opp …</span></>
          ) : (
            <><Upload className="w-5 h-5 text-zinc-400" /><span className="text-[11px] font-medium text-zinc-600">Dra inn eller velg .html</span></>
          )}
        </label>
      )}
    </div>
  )
}

export function HtmlFields({ landscapeUrl, portraitUrl, onLandscape, onPortrait }: {
  landscapeUrl: string | null
  portraitUrl: string | null
  onLandscape: (url: string | null) => void
  onPortrait: (url: string | null) => void
}) {
  const [copied, setCopied] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(STARTER_PROMPT)
      setCopied(true)
      toast.success("Startprompt kopiert — lim inn i Claude eller ChatGPT")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Kunne ikke kopiere — marker teksten og kopier manuelt")
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600">
        <Code2 className="w-3.5 h-3.5" /> HTML-side
      </label>
      <p className="text-[11px] text-zinc-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        Last opp en <strong>selvstendig HTML-fil</strong> (én for liggende, én for stående). Den saneres
        automatisk og vises i en <strong>låst sandkasse uten JavaScript</strong> — CSS-animasjon kjører,
        men ingenting kan kjøre kode eller laste noe fra nettet. Lag den gjerne med Claude/ChatGPT ↓
      </p>

      {/* Startprompt til Claude/ChatGPT */}
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 overflow-hidden">
        <button type="button" onClick={() => setShowPrompt((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-[11px] font-semibold text-violet-800 hover:bg-violet-50">
          <Sparkles className="w-3.5 h-3.5" />
          Slik får du Claude til å lage det råflott — {showPrompt ? "skjul" : "vis"} startprompt
        </button>
        {showPrompt && (
          <div className="px-3 pb-3 space-y-2">
            <div className="flex justify-end">
              <button type="button" onClick={copyPrompt}
                className="inline-flex items-center gap-1.5 rounded-md bg-violet-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-violet-800">
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Kopiert" : "Kopier startprompt"}
              </button>
            </div>
            <pre className="max-h-64 overflow-auto rounded-md bg-white border border-violet-100 p-3 text-[10.5px] leading-relaxed text-zinc-700 whitespace-pre-wrap font-mono">{STARTER_PROMPT}</pre>
            <p className="text-[10px] text-violet-700/80">
              Bytt ut [BUTIKK], [BUDSKAP], [PRIS], [FARGER] og [STIL], og be om begge filene. Last dem opp under.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Slot label="Liggende skjermer" hint="1920 × 1080 px (16:9) — over kassa o.l." url={landscapeUrl} onChange={onLandscape} ratio="16 / 9" />
        <Slot label="Stående skjermer" hint="1080 × 1920 px (9:16) — reklametavle" url={portraitUrl} onChange={onPortrait} ratio="9 / 16" />
      </div>
      <p className="text-[10px] text-zinc-400">
        Tips: sterk kontrast, ett dominerende budskap, rolig animasjon som looper — og hold viktig tekst
        innenfor 6–8 % marg (TV-er kan beskjære kantene). Maks 1,5 MB per fil.
      </p>
    </div>
  )
}
