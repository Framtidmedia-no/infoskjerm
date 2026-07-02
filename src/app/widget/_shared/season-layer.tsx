"use client"

import type { CSSProperties } from "react"
import type { SeasonKey } from "@/lib/season"

/**
 * Diskré sesongatmosfære over bakgrunnen, under kortene («Levende skjerm»).
 * Maks 16 partikler, kun transform-animasjon, deterministiske verdier fra
 * indeks (aldri Math.random — SSR-hydrering må matche klienten). Sommer har
 * ingen partikler (varmere tone håndteres av AmbientBackdrop via Season.tint).
 */

const COUNT = 16
const FLAG_COLORS = ["#ba0c2f", "#ffffff", "#00205b"]

const KEYFRAMES =
  "@keyframes lsFall{from{transform:translate3d(0,-6vh,0)}to{transform:translate3d(var(--ls-sway,0px),106vh,0)}}@media (prefers-reduced-motion: reduce){.ls-particle{display:none}}"

function particleStyle(i: number, season: "jul" | "syttendemai"): CSSProperties {
  // Primtalls-hopp gir jevn, deterministisk spredning uten tilfeldighet.
  const left = (i * 61) % 100
  const size = 6 + ((i * 7) % 9)
  const dur = 12 + ((i * 5) % 11)
  const delay = -((i * 3.7) % dur) // negativ delay → «himmelen er i gang» fra første frame
  const sway = ((i % 5) - 2) * 30
  return {
    position: "absolute",
    top: 0,
    left: `${left}%`,
    width: size,
    height: season === "jul" ? size : Math.round(size * 1.6),
    borderRadius: season === "jul" ? 9999 : 2,
    background: season === "jul" ? "rgba(255,255,255,.75)" : FLAG_COLORS[i % 3],
    opacity: 0.35 + ((i * 13) % 50) / 100,
    animation: `lsFall ${dur}s linear ${delay}s infinite`,
    ["--ls-sway" as string]: `${sway}px`,
    pointerEvents: "none",
    willChange: "transform",
  }
}

export function SeasonLayer({ season }: { season: SeasonKey | null }) {
  if (season !== "jul" && season !== "syttendemai") return null
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <style>{KEYFRAMES}</style>
      {Array.from({ length: COUNT }, (_, i) => (
        <div key={i} className="ls-particle" style={particleStyle(i, season)} />
      ))}
    </div>
  )
}
