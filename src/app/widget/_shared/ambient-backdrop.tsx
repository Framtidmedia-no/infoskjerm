"use client"

import type { CSSProperties } from "react"
import { hexAlpha } from "./tokens"

/**
 * Levende, kjedefarget bakgrunn bak alle kort («Levende skjerm»). To store,
 * ferdig-myke radial-gradient-blobs i aksentfargen drifter sakte med transform
 * (aldri animert filter/blur — Raspberry Pi er ytelsesgulvet), over en mørk
 * basisgradient, med et statisk korn-lag (ren lav opacity, bevisst IKKE
 * mix-blend-mode: blend over animerte lag tvinger kontinuerlig re-kompositt).
 * Legges BAKERST i rotator-framen; kort med egen bakgrunn dekker den.
 */

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>\")"

const KEYFRAMES =
  "@keyframes lsDriftA{from{transform:translate3d(-6%,-4%,0) scale(1)}to{transform:translate3d(5%,6%,0) scale(1.15)}}@keyframes lsDriftB{from{transform:translate3d(4%,6%,0) scale(1.1)}to{transform:translate3d(-5%,-5%,0) scale(1)}}@media (prefers-reduced-motion: reduce){.ls-blob{animation:none!important}}"

const blobBase: CSSProperties = { position: "absolute", inset: "-20%", pointerEvents: "none", willChange: "transform" }

export function AmbientBackdrop({ accent = "#16a34a", tint = null, intensity = "normal" }: { accent?: string; tint?: string | null; intensity?: "subtle" | "normal" }) {
  const a = intensity === "subtle" ? 0.1 : 0.16
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(135deg,#0a0a0c,#141418)" }}>
      <style>{KEYFRAMES}</style>
      <div className="ls-blob" style={{ ...blobBase, background: `radial-gradient(46% 38% at 78% 12%, ${hexAlpha(accent, a)}, transparent 70%)`, animation: "lsDriftA 26s ease-in-out infinite alternate" }} />
      <div className="ls-blob" style={{ ...blobBase, background: `radial-gradient(42% 40% at 16% 86%, ${hexAlpha(tint || accent, a * 0.75)}, transparent 70%)`, animation: "lsDriftB 34s ease-in-out infinite alternate" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: GRAIN, opacity: 0.05, pointerEvents: "none" }} />
    </div>
  )
}
