"use client"

import { useEffect, useState } from "react"
import type { LiveItem } from "@/lib/content/live"

/**
 * Råflott galleri-kort: stor overskrift + et galleri som veksler mellom varer
 * (bilde, navn, pris, prisinfo) med myk crossfade, valgfri QR-kode.
 * - Kundeskjerm (portrait): bilde i full bredde med tekst/pris nederst.
 * - Bakrom (landscape): tekst + pris til venstre, produktbilde til høyre.
 * Tema styrer palett + kicker-tekst.
 */

type Theme = "catering" | "meny" | "ansattilbud"

const THEMES: Record<Theme, { bg: string; accent: string; ink: string; kicker: string }> = {
  catering: { bg: "linear-gradient(135deg,#1c1207 0%,#3d2410 50%,#7a3e12 100%)", accent: "#f59e0b", ink: "#1c1207", kicker: "Catering" },
  meny: { bg: "linear-gradient(135deg,#0a0a0a 0%,#1a1320 55%,#2a2030 100%)", accent: "#f5c451", ink: "#0a0a0a", kicker: "Meny" },
  ansattilbud: { bg: "linear-gradient(135deg,#052e1a 0%,#0a4a2a 55%,#16a34a 100%)", accent: "#bbf7d0", ink: "#052e1a", kicker: "Ansattilbud" },
}

const ROTATE_MS = 4500

export function GalleryCard({ item, qrUrl, portrait = false }: { item: LiveItem; qrUrl?: string; portrait?: boolean }) {
  const g = item.gallery
  const items = g?.items ?? []
  const theme = THEMES[(g?.theme as Theme) ?? "catering"] ?? THEMES.catering
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % items.length), ROTATE_MS)
    return () => clearInterval(t)
  }, [items.length])

  const fg = item.textColor ?? "#fff"
  const accent = theme.accent
  const current = items[idx % Math.max(1, items.length)] ?? null
  const pad = portrait ? 64 : 78

  const heading = (
    <div style={{ flex: "0 0 auto" }}>
      <p style={{ margin: 0, color: accent, fontWeight: 800, letterSpacing: 5, fontSize: portrait ? 30 : 26, textTransform: "uppercase" }}>{theme.kicker}</p>
      <h1 style={{ margin: "10px 0 0", fontSize: portrait ? 92 : 76, fontWeight: 900, lineHeight: 1.02, letterSpacing: -2, textShadow: "0 6px 30px rgba(0,0,0,.35)" }}>{item.title}</h1>
    </div>
  )

  // Price tag hugs its content (never spans the full width).
  const priceTag = (big: boolean) =>
    current && (current.price || current.priceInfo) ? (
      <div style={{ display: "inline-flex", alignSelf: "flex-start", width: "fit-content", alignItems: "baseline", gap: 12, background: accent, color: theme.ink, fontWeight: 900, padding: big ? "16px 34px" : "12px 28px", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,.35)" }}>
        {current.price && <span style={{ fontSize: big ? 76 : 58 }}>{current.price}</span>}
        {current.priceInfo && <span style={{ fontSize: big ? 32 : 28, fontWeight: 800, opacity: 0.85 }}>{current.priceInfo}</span>}
      </div>
    ) : null

  const imageBox = (style: React.CSSProperties) => (
    <div style={{ borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.45)", background: "rgba(255,255,255,.06)", ...style }}>
      {current?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, opacity: 0.5 }}>🍽️</div>
      )}
    </div>
  )

  // Portrait (kundeskjerm): full-bleed image with name/price overlaid at the bottom.
  const featuredFull = current && (
    <div key={idx} style={{ position: "relative", flex: "1 1 auto", minHeight: 0, borderRadius: 28, overflow: "hidden", boxShadow: "0 24px 70px rgba(0,0,0,.45)", background: "rgba(255,255,255,.06)", animation: "grGalFade .7s ease-out" }}>
      {current.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current.imageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 120, opacity: 0.5 }}>🍽️</div>
      )}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,.8) 0%, rgba(0,0,0,.12) 46%, transparent 70%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 44, display: "flex", flexDirection: "column", gap: 18 }}>
        <h2 style={{ margin: 0, fontSize: 66, fontWeight: 900, lineHeight: 1.05, textShadow: "0 4px 20px rgba(0,0,0,.5)" }}>{current.name}</h2>
        {priceTag(false)}
      </div>
    </div>
  )

  // Landscape (bakrom): text + price LEFT, product image RIGHT.
  const featuredSplit = current && (
    <div key={idx} style={{ flex: "1 1 auto", minHeight: 0, display: "flex", gap: 54, alignItems: "stretch", animation: "grGalFade .7s ease-out" }}>
      <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
        <h2 style={{ margin: 0, fontSize: 80, fontWeight: 900, lineHeight: 1.04, letterSpacing: -1, textShadow: "0 4px 20px rgba(0,0,0,.35)" }}>{current.name}</h2>
        {priceTag(true)}
      </div>
      {imageBox({ flex: "0 0 52%", minWidth: 0 })}
    </div>
  )

  const dots = items.length > 1 && (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {items.map((_, i) => (
        <span key={i} style={{ width: i === idx ? 44 : 14, height: 14, borderRadius: 9999, background: i === idx ? accent : "rgba(255,255,255,.3)", transition: "all .3s" }} />
      ))}
    </div>
  )

  const qrPanel = qrUrl && (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 22, background: "rgba(255,255,255,.08)", borderRadius: 22, padding: portrait ? "20px 28px" : "16px 22px" }}>
      <div style={{ background: "#fff", padding: 12, borderRadius: 14, boxShadow: "0 12px 40px rgba(0,0,0,.35)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR-kode" width={portrait ? 170 : 130} height={portrait ? 170 : 130} style={{ display: "block" }} />
      </div>
      <div style={{ fontSize: portrait ? 38 : 32, fontWeight: 900, color: accent, maxWidth: 300, lineHeight: 1.1 }}>{g?.qrLabel || "Skann her"}</div>
    </div>
  )

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", color: fg, background: item.bgColor ?? theme.bg, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{"@keyframes grGalFade{from{opacity:0;transform:scale(1.03)}to{opacity:1;transform:none}}"}</style>
      <div style={{ position: "absolute", top: -160, right: -120, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,.08), transparent 70%)" }} />

      {portrait ? (
        <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", gap: 30, boxSizing: "border-box" }}>
          {heading}
          {featuredFull}
          <div style={{ display: "flex", justifyContent: "center" }}>{dots}</div>
          {qrUrl && <div style={{ display: "flex", justifyContent: "center" }}>{qrPanel}</div>}
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0, padding: pad, display: "flex", flexDirection: "column", gap: 32, boxSizing: "border-box" }}>
          {heading}
          {featuredSplit}
          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
            <div>{dots}</div>
            {qrUrl && qrPanel}
          </div>
        </div>
      )}
    </div>
  )
}
