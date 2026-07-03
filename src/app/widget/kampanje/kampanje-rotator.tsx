"use client"

import { useEffect, useState, type CSSProperties } from "react"
import type { LiveItem } from "@/lib/content/live"
import { OfferCard, type ChainBrand } from "@/app/widget/tilbud/offer-card"
import { CampaignCard } from "./campaign-card"
import { CompetitionCard } from "@/app/widget/_shared/competition-card"
import { GalleryCard } from "@/app/widget/_shared/gallery-card"
import { AmbientBackdrop } from "@/app/widget/_shared/ambient-backdrop"
import { SceneTransition, usePreloadNext } from "@/app/widget/_shared/scene-transition"
import { SeasonLayer } from "@/app/widget/_shared/season-layer"
import { formatPeriod, expiryLabel } from "@/app/widget/_shared/period"
import { KEYFRAMES as TOKEN_KEYFRAMES, hexAlpha } from "@/app/widget/_shared/tokens"
import type { Season } from "@/lib/season"
import { FullscreenMedia } from "@/app/widget/_shared/fullscreen-media"
import { HtmlSlide } from "@/app/widget/_shared/html-slide"
import { fullscreenItemSeconds, posterImageUrls } from "@/lib/content/fullscreen"

/**
 * Liggende kunde-kampanjeskjerm (1920×1080). Roterer butikkens kunde-slides:
 * strukturerte kampanjekort (Mobile-stil) for items med `campaign`, ellers et
 * helbilde-fallback med tittel. Egen rotasjon + periodisk reload.
 */

const DEFAULT_SECONDS = 9
// Sekunder per side når et plakat-kort blar gjennom flere bilder (kundeavis).
const POSTER_PAGE_SECONDS = 7

const frame: CSSProperties = {
  margin: 0,
  width: "100%",
  height: "100vh",
  overflow: "hidden",
  position: "relative",
  background: "#0a0a0c",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#fff",
}

/**
 * Liggende plakat/artikkel: tekstpanel til VENSTRE (kicker, tittel, punkter,
 * periode) og bildet til HØYRE (contain + uskarp fyll). Manglende/ødelagt bilde
 * gir branded gradient, aldri svart slide med brutt bilde-ikon. Fyller 1920×1080.
 */
function LandscapePoster({ item, chain, qrUrl }: { item: LiveItem; chain?: ChainBrand | null; qrUrl?: string }) {
  const [imgOk, setImgOk] = useState(true)
  const [pageI, setPageI] = useState(0)
  const brand = chain?.color || "#0a5c2b"
  const urgent = expiryLabel(item.validTo)
  const period = urgent ?? formatPeriod(item.validFrom, item.validTo)
  const pulse = urgent ? { animation: "wPulse 1.6s ease-in-out infinite", boxShadow: `0 0 24px ${hexAlpha(brand, 0.6)}` } : {}
  const kicker = item.type === "news" ? "Aktuelt" : "Tilbud"
  // Media kan være video, PDF/PowerPoint, forhåndsrendret kundeavis (pages) eller
  // vanlige bilder — ikke bare imageUrl. Uten dette ble video/kundeavis vist som
  // et brutt bilde-ikon. Fallback = branded gradient, aldri svart brutt slide.
  const isVideo = item.isVideo && !!item.imageUrl
  const isDoc = (item.isPdf || item.isPpt) && !!item.imageUrl && item.pages.length === 0
  const imgUrls = posterImageUrls(item)
  // Flersidige items (kundeavis-sider, gallerier) blar gjennom bildene i
  // mediafeltet — før viste vi kun første URL, og for kundeavis var det PDF-en.
  useEffect(() => {
    if (imgUrls.length <= 1) return
    const id = setTimeout(() => {
      setPageI((v) => (v + 1) % imgUrls.length)
      setImgOk(true)
    }, POSTER_PAGE_SECONDS * 1000)
    return () => clearTimeout(id)
  }, [pageI, imgUrls.length])
  const img = imgUrls.length ? imgUrls[pageI % imgUrls.length] : null
  const hasMedia = isVideo || isDoc || (!!img && imgOk)
  return (
    <div style={{ position: "absolute", inset: 0, containerType: "size", overflow: "hidden", display: "flex", background: "#0a0a0c" }}>
      {/* Venstre: tekstpanel */}
      <div style={{ width: "40cqw", flex: "0 0 auto", boxSizing: "border-box", padding: "8cqh 4.5cqw", display: "flex", flexDirection: "column", justifyContent: "center", gap: "2.2cqh", background: `linear-gradient(135deg, ${brand} 0%, #0a0a0c 92%)`, position: "relative", zIndex: 2 }}>
        <span style={{ color: "#fff", opacity: 0.85, fontWeight: 800, letterSpacing: "0.4cqh", fontSize: "2.6cqh", textTransform: "uppercase" }}>{kicker}</span>
        {item.title && <h1 style={{ margin: 0, fontSize: "8.5cqh", fontWeight: 900, lineHeight: 1.02, letterSpacing: "-0.2cqh" }}>{item.title}</h1>}
        {item.blocks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.1cqh", maxHeight: "38cqh", overflow: "hidden" }}>
            {item.blocks.slice(0, 6).map((b, i) =>
              b.kind === "li" ? (
                <div key={i} style={{ display: "flex", gap: "1.2cqw", fontSize: "3cqh", lineHeight: 1.35, color: "rgba(255,255,255,.92)" }}>
                  <span>•</span>
                  <span>{b.text}</span>
                </div>
              ) : (
                <p key={i} style={{ margin: 0, fontSize: b.kind === "h" ? "3.6cqh" : "3cqh", fontWeight: b.kind === "h" ? 800 : 400, lineHeight: 1.35, color: "rgba(255,255,255,.92)" }}>{b.text}</p>
              )
            )}
          </div>
        )}
        {period && <span style={{ alignSelf: "flex-start", background: "#fff", color: "#0a0a0a", fontWeight: 800, fontSize: "2.8cqh", padding: "1.2cqh 3cqw", borderRadius: "100cqh", marginTop: "0.8cqh", ...pulse }}>{period}</span>}
      </div>

      {/* Høyre: media (video / PDF / bilde, contain + uskarp fyll) eller branded gradient */}
      <div style={{ flex: "1 1 auto", position: "relative", overflow: "hidden", background: hasMedia ? "#0a0a0c" : `radial-gradient(120% 120% at 62% 30%, ${brand} 0%, #0a0a0c 72%)` }}>
        {isVideo ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={item.imageUrl!} autoPlay muted loop playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: item.bgColor ?? "#0a0a0c" }} />
        ) : isDoc ? (
          <iframe title={item.title} src={`${item.imageUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "#fff" }} />
        ) : img ? (
          <>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${img}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(40px) brightness(.5)", transform: "scale(1.2)", opacity: imgOk ? 1 : 0 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img key={img} src={img} alt="" onError={() => setImgOk(false)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", opacity: imgOk ? 1 : 0, animation: "grKb 18s ease-in-out infinite alternate" }} />
          </>
        ) : null}
      </div>

      {chain?.name && <span style={{ position: "absolute", right: "3cqw", top: "5cqh", fontSize: "3cqh", fontWeight: 900, letterSpacing: "0.2cqh", textShadow: "0 2px 6px rgba(0,0,0,.5)", zIndex: 3 }}>{chain.name}</span>}
      {qrUrl && (
        <div style={{ position: "absolute", right: "3cqw", bottom: "5cqh", background: "#fff", borderRadius: "1.4cqh", padding: "1.4cqh", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.6cqh", boxShadow: "0 1.5cqh 4cqh rgba(0,0,0,.4)", zIndex: 3 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="QR" style={{ width: "12cqh", height: "12cqh", display: "block", borderRadius: "0.5cqh" }} />
          <span style={{ color: "#0a0a0a", fontWeight: 900, fontSize: "1.6cqh", letterSpacing: "0.1cqh", textTransform: "uppercase" }}>Skann</span>
        </div>
      )}
    </div>
  )
}

export function KampanjeRotator({ items, chain = null, qr = {}, season = null }: { items: LiveItem[]; chain?: ChainBrand | null; qr?: Record<string, string>; season?: Season | null }) {
  const [i, setI] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const it = items[i % items.length]
    // Dokumenter med forhåndsrendrede sider (kundeavis) trenger tid til å bla
    // gjennom alle sidene — ellers rekker bare første side å vises.
    const docPages = it && (it.isPdf || it.isPpt) ? it.pages.length : 0
    const secs = (it ? fullscreenItemSeconds(it, false, DEFAULT_SECONDS) : null) ?? it?.durationSeconds ?? (docPages > 1 ? docPages * POSTER_PAGE_SECONDS : DEFAULT_SECONDS)
    const id = setTimeout(() => setI((v) => (v + 1) % items.length), secs * 1000)
    return () => clearTimeout(id)
  }, [i, items])

  useEffect(() => {
    const id = setTimeout(() => window.location.reload(), 10 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  const item = items.length ? items[i % items.length] : null

  const accent = chain?.color || "#16a34a"
  const next = items.length > 1 ? items[(i + 1) % items.length] : null
  usePreloadNext(next)

  return (
    <main style={frame}>
      <style>{"@keyframes grKb{from{transform:scale(1)}to{transform:scale(1.08)}}" + TOKEN_KEYFRAMES}</style>
      <AmbientBackdrop accent={accent} tint={season?.tint ?? null} intensity="normal" />
      <SeasonLayer season={season?.key ?? null} />
      {!item ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 34 }}>
          Ingen aktive kampanjer
        </div>
      ) : (
        <div style={{ position: "absolute", inset: 0 }}>
          <SceneTransition itemKey={item.id}>
            {item.imageMode === "fullskjerm" ? (
              // Fullskjerm-media: kant til kant uten tekstpanel — foran alle kort-typer.
              <FullscreenMedia item={item} portrait={false} />
            ) : item.imageMode === "html" ? (
              // Sanert HTML-side i låst sandbox-iframe (liggende variant).
              <HtmlSlide landscapeUrl={item.htmlLandscape} portraitUrl={item.htmlPortrait} portrait={false} />
            ) : item.campaign ? (
              <CampaignCard item={item} chain={chain} />
            ) : item.type === "competition" ? (
              <CompetitionCard item={item} qrUrl={qr[item.id]} />
            ) : item.type === "gallery" ? (
              <GalleryCard item={item} qrUrl={qr[item.id]} />
            ) : item.offer ? (
              <OfferCard item={item} chain={chain} orientation="landscape" />
            ) : (
              <LandscapePoster item={item} chain={chain} qrUrl={qr[item.id]} />
            )}
          </SceneTransition>
        </div>
      )}
    </main>
  )
}
