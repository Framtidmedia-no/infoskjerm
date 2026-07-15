"use client"

import { useState } from "react"
import { MediaUploader } from "@/components/admin/media-uploader"
import { isDeckUrl, isPptUrl } from "@/lib/content/deck"
import { FileText, X } from "lucide-react"

/**
 * Fullskjerm-modus: to opplastingsslots (liggende + stående) med anbefalte mål.
 * Minst én må fylles; mangler én, vises den andre på begge orienteringer med
 * uskarp utfylling. Aspekt-sjekken er et mildt hint (blokkerer aldri).
 */

const ACCEPT = [
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/avif",
  "application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-powerpoint",
  "video/mp4", "video/webm", "video/quicktime",
]

// Hint vises når bildets forhold avviker mer enn dette fra slotens mål.
const ASPECT_TOLERANCE = 0.1

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/.test(url.toLowerCase().split("?")[0])
}

function Slot({ label, hint, url, onChange, wantW, wantH }: {
  label: string
  hint: string
  url: string | null
  onChange: (url: string | null) => void
  wantW: number
  wantH: number
}) {
  const [ratio, setRatio] = useState<number | null>(null)
  const want = wantW / wantH
  const off = ratio !== null && Math.abs(ratio - want) / want > ASPECT_TOLERANCE
  const deck = isDeckUrl(url)
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2">
      <div>
        <span className="text-[11px] font-semibold text-zinc-700">{label}</span>
        <p className="text-[10px] text-zinc-400">{hint}</p>
      </div>
      {url ? (
        <div className="relative rounded-xl overflow-hidden border border-zinc-200 group bg-zinc-900">
          {deck ? (
            <div className="w-full h-36 flex items-center justify-center text-white gap-2 text-sm font-semibold">
              <FileText className="w-5 h-5" /> {isPptUrl(url) ? "PowerPoint" : "PDF"}
            </div>
          ) : isVideoUrl(url) ? (
            <video src={url} muted loop autoPlay playsInline className="w-full h-36 object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-36 object-contain"
              onLoad={(e) => { const img = e.currentTarget; if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight) }} />
          )}
          <button type="button" onClick={() => { onChange(null); setRatio(null) }} aria-label="Fjern fil"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <MediaUploader maxFiles={1} accept={ACCEPT} onUpload={(files) => { const u = files[0]?.url; if (u) onChange(u) }} />
      )}
      {off && !deck && url && !isVideoUrl(url) && (
        <p className="text-[10px] text-amber-600">Formatet avviker fra {wantW}:{wantH} — vises med uskarp utfylling rundt.</p>
      )}
    </div>
  )
}

export function FullscreenMediaFields({ landscapeUrl, portraitUrl, onLandscape, onPortrait, showBoth, onShowBoth, surface, allowBoth = true }: {
  landscapeUrl: string | null
  portraitUrl: string | null
  onLandscape: (url: string | null) => void
  onPortrait: (url: string | null) => void
  showBoth: boolean
  onShowBoth: (v: boolean) => void
  surface: "kunde" | "intern"
  /** Skjul «vis på begge flater» når tenanten kun har én flate (hideKundeflate/hideInternflate). */
  allowBoth?: boolean
}) {
  const anyDeck = isDeckUrl(landscapeUrl) || isDeckUrl(portraitUrl)
  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-zinc-600">Fullskjerm-media</label>
      <p className="text-[11px] text-zinc-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
        Vises <strong>kant til kant uten tittel eller ramme</strong>. Last opp én fil per orientering for perfekt
        resultat — fyller du bare én, vises den på begge med uskarp utfylling der formatet ikke passer.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Slot label="Liggende skjermer" hint="Anbefalt: 1920×1080 px (16:9) — eller 3840×2160" url={landscapeUrl} onChange={onLandscape} wantW={16} wantH={9} />
        <Slot label="Stående skjermer" hint="Anbefalt: 1080×1920 px (9:16)" url={portraitUrl} onChange={onPortrait} wantW={9} wantH={16} />
      </div>
      {anyDeck && (
        <p className="text-[10px] text-zinc-400">
          PowerPoint: bruk 16:9-lysbilder for liggende; egendefinert lysbildestørrelse 19,05 × 33,87 cm for stående.
          PDF: eksporter i samme forhold som skjermen. <strong className="text-amber-600">Maks 6 sider vises</strong> —
          sidene gjøres klare automatisk etter publisering (tar noen minutter).
        </p>
      )}
      {allowBoth && (
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
          <input type="checkbox" checked={showBoth} onChange={(e) => onShowBoth(e.target.checked)} className="rounded border-zinc-300" />
          Vis også på {surface === "kunde" ? "interne skjermer" : "kundeskjermene"}
        </label>
      )}
    </div>
  )
}
