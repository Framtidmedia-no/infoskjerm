"use client"

import { useEffect, useState } from "react"
import { isDeckUrl } from "@/lib/content/deck"
import { pickFullscreenVariant, FULLSCREEN_PAGE_SECONDS, type FullscreenSource } from "@/lib/content/fullscreen"

/**
 * Fullskjerm-media uten tittel/kicker/ramme: bilde, video eller forhånds-
 * rendrede dokumentsider (PDF/PPT) kant til kant. Feil aspekt fylles med en
 * uskarp cover-kopi bak (aldri svarte striper, aldri beskåret innhold).
 * Dokument uten ferdige sider viser en diskret vente-tilstand — sidene rendres
 * i GitHub Action (render-decks), aldri som iframe på Pi-en. Video får svart
 * bakgrunn (et uskarpt video-bakteppe = to samtidige videoer, for tungt for Pi).
 */

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)$/.test(url.toLowerCase().split("?")[0])
}

function BlurFill({ url }: { url: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${url}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(52px) brightness(.55)", transform: "scale(1.2)" }} />
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${url}')`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
    </>
  )
}

export function FullscreenMedia({ item, portrait }: { item: FullscreenSource & { durationSeconds: number | null }; portrait: boolean }) {
  const variant = pickFullscreenVariant(item, portrait)
  const url = variant.url
  const deck = isDeckUrl(url)
  const pages = deck ? variant.pages : []
  const perPageMs = (item.durationSeconds ?? FULLSCREEN_PAGE_SECONDS) * 1000
  const [page, setPage] = useState(0)

  useEffect(() => {
    if (pages.length <= 1) return
    const id = setTimeout(() => setPage((p) => (p + 1) % pages.length), perPageMs)
    return () => clearTimeout(id)
  }, [page, pages.length, perPageMs])

  if (!url) return null

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000", overflow: "hidden" }}>
      <style>{"@keyframes grFsFade{from{opacity:0}to{opacity:1}}"}</style>
      {isVideoUrl(url) ? (
        <video src={url} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
      ) : deck ? (
        pages.length > 0 ? (
          <div key={page} style={{ position: "absolute", inset: 0, animation: "grFsFade .5s ease-out" }}>
            <BlurFill url={pages[page % pages.length]} />
          </div>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.45)", fontSize: 34, fontFamily: "Arial, Helvetica, sans-serif" }}>
            Gjøres klar for skjerm …
          </div>
        )
      ) : (
        <BlurFill url={url} />
      )}
    </div>
  )
}
