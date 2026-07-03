"use client"

import { useState, useId, useEffect, useRef } from "react"
import { Code2, X, Loader2, Upload, Copy, Check, Sparkles } from "lucide-react"
import { toast } from "sonner"

/**
 * HTML-innholdstype: to opplastingsslots (liggende + stående). Brukeren lager en
 * selvstendig HTML-side (gjerne med Claude/ChatGPT — se startprompten under) og
 * laster den opp. På skjermen vises den i en sandbox-iframe (allow-scripts, uten
 * same-origin): CSS-animasjon OG JavaScript kjører, men koden er jailet fra
 * systemet vårt. Hold alt i én fil så den også virker offline.
 *
 * Minst én slot må fylles; mangler én, vises den andre på begge orienteringer.
 */

const MAX_BYTES = 4_000_000

// Startprompt brukeren kan kopiere rett inn i Claude/ChatGPT. Matcher det vi
// tillater: selvstendig fil, begge orienteringer, JS er lov (men hold alt inline).
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

HARDE TEKNISKE KRAV — MÅ følges nøyaktig:
1. ÉN selvstendig .html-fil per retning. ALT inne i fila: CSS i <style>, ev. JS i
   <script>, bilder/logo som data:-URI (base64). INGEN <link>, INGEN Google
   Fonts/CDN, INGEN eksterne bilder eller kall ut på nettet — alt inline. (Da
   spiller siden videre selv om skjermen mister nettet.) Web-trygge systemfonter.
2. Bevegelse: CSS (@keyframes/transition/transform) ELLER JavaScript — begge
   kjører. La animasjonen loope rolig og sømløst; ingen harde blink/stroboskop.
3. Fyll HELE flaten. <body> uten marg/scrollbar, overflow: hidden, ingen hvite kanter.
4. STOR, lesbar typografi (ses på flere meters avstand). Sterk kontrast. Ett
   dominerende budskap.
5. TRYGG MARG: hold viktig tekst/logo minst 6–8 % inn fra hver kant (TV-er kan beskjære).
6. Under ca. 4 MB per fil.

LEVER: hver fil som én komplett kodeblokk (start med <!doctype html>), tydelig merket
«LIGGENDE (1920×1080)» og «STÅENDE (1080×1920)». Lag noe råflott og profesjonelt.`

async function uploadHtml(file: File): Promise<{ url: string; html: string }> {
  const text = await file.text()
  const res = await fetch("/api/admin/innhold/html-sanitize", {
    method: "POST",
    headers: { "Content-Type": "text/html; charset=utf-8" },
    body: text,
  })
  const data = (await res.json().catch(() => ({}))) as { url?: string; html?: string; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error ?? "Opplasting feilet")
  return { url: data.url, html: data.html ?? "" }
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
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const inputId = useId()

  // Skaler forhåndsvisningen: rendrer iframen i EKTE designoppløsning (1920×1080
  // / 1080×1920) og krymper den til boksen med transform — ellers ville en side
  // laget for stor skjerm sett klemt/avkuttet ut i den lille preview-boksen.
  const [designW, designH] = ratio.trim().startsWith("9") ? [1080, 1920] : [1920, 1080]
  const boxRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setScale(el.clientWidth / designW)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [designW, url])

  // Storage serverer .html som text/plain, så forhåndsvisningen bruker srcdoc.
  // Ved redigering får vi en URL uten strengen — hent den (kroppen ER HTML-en).
  useEffect(() => {
    if (url && !previewHtml) {
      let alive = true
      fetch(url).then((r) => (r.ok ? r.text() : null)).then((t) => { if (alive && t) setPreviewHtml(t) }).catch(() => {})
      return () => { alive = false }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  async function handleFile(file?: File | null) {
    if (!file) return
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      toast.error("Velg en .html-fil.")
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(`Fila er ${(file.size / 1024 / 1024).toFixed(1)} MB — maks 4 MB. Komprimer bilder eller legg dem inn som data-URI.`)
      return
    }
    setBusy(true)
    try {
      const { url: u, html } = await uploadHtml(file)
      setPreviewHtml(html)
      onChange(u)
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
        <div ref={boxRef} className="relative rounded-xl overflow-hidden border border-zinc-200 group bg-black" style={{ aspectRatio: ratio }}>
          <iframe srcDoc={previewHtml ?? ""} title={`Forhåndsvisning ${label}`} sandbox="allow-scripts" scrolling="no"
            style={{ position: "absolute", top: 0, left: 0, width: designW, height: designH, transformOrigin: "top left", transform: `scale(${scale || 0.0001})`, border: 0 }}
            className="pointer-events-none" />
          <button type="button" onClick={() => { onChange(null); setPreviewHtml(null) }} aria-label="Fjern fil"
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
            <><Loader2 className="w-5 h-5 text-zinc-500 animate-spin" /><span className="text-[11px] text-zinc-500">Laster opp …</span></>
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
        Last opp en <strong>selvstendig HTML-fil</strong> (én for liggende, én for stående). Den vises i en
        <strong>sandkasse på skjermen</strong> — CSS-animasjon og JavaScript kjører, men koden er jailet og
        kan aldri røre systemet, andre butikker eller kundedata. Hold alt i én fil (ingen eksterne kall) så
        den også spiller videre om skjermen mister nettet. Lag den gjerne med Claude/ChatGPT ↓
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
        innenfor 6–8 % marg (TV-er kan beskjære kantene). Hold alt i én fil (ingen eksterne kall) så den
        virker offline. Maks 4 MB per fil.
      </p>
    </div>
  )
}
