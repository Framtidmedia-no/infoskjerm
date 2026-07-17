import { Bricolage_Grotesque, Big_Shoulders, Geist_Mono } from "next/font/google"

/**
 * Display-font for offentlige flater (login, glemt passord, velkommen,
 * påmelding). Scopes per side via `displayFont.variable` + `.font-display`
 * (globals.css) — lastes IKKE globalt, så /widget/*-sidene forblir uberørt.
 */
export const displayFont = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

/**
 * Fonter for den offentlige produktsiden (/) — Carnival-temaet.
 * Scopes via (marketing)/layout.tsx; lastes ikke på admin/widget/auth.
 */
export const carnivalFont = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-carnival",
  display: "swap",
  axes: ["opsz"],
})

export const monoFont = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
})
