"use client"

import { useEffect, useState } from "react"

/**
 * Renders the first pages of a PDF flyer (kundeavis) to images in the browser
 * with pdf.js, then rotates through them full-screen. No server-side rendering —
 * the player's Chromium rasterises the pages. Portrait flyer pages fill a
 * portrait screen; on landscape they are contained over a blurred fill.
 */

const MAX_PAGES = 6
const PAGE_SECONDS = 7

export function PdfFlyer({ url }: { url: string }) {
  const [pages, setPages] = useState<string[]>([])
  const [i, setI] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const pdfjs = await import("pdfjs-dist")
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
      const doc = await pdfjs.getDocument({ url }).promise
      const n = Math.min(MAX_PAGES, doc.numPages)
      const out: string[] = []
      for (let p = 1; p <= n && !cancelled; p++) {
        const page = await doc.getPage(p)
        const viewport = page.getViewport({ scale: 1.6 })
        const canvas = document.createElement("canvas")
        canvas.width = Math.ceil(viewport.width)
        canvas.height = Math.ceil(viewport.height)
        const ctx = canvas.getContext("2d")
        if (!ctx) continue
        await page.render({ canvasContext: ctx, viewport }).promise
        out.push(canvas.toDataURL("image/jpeg", 0.82))
        if (!cancelled) setPages([...out]) // progressively reveal as pages render
      }
    })().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [url])

  useEffect(() => {
    if (pages.length <= 1) return
    const id = setTimeout(() => setI((v) => (v + 1) % pages.length), PAGE_SECONDS * 1000)
    return () => clearTimeout(id)
  }, [i, pages])

  if (pages.length === 0) {
    return (
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.4)", fontSize: 30 }}>
        Laster kundeavis…
      </div>
    )
  }

  const page = pages[i % pages.length]
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url('${page}')`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(48px) brightness(0.4)", transform: "scale(1.25)" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img key={i} src={page} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", animation: "grFade .5s ease-out" }} />
      {pages.length > 1 && (
        <div style={{ position: "absolute", bottom: 22, left: 0, right: 0, display: "flex", gap: 10, justifyContent: "center" }}>
          {pages.map((_, p) => (
            <span key={p} style={{ width: 12, height: 12, borderRadius: 9999, background: p === i % pages.length ? "#16a34a" : "rgba(255,255,255,.4)" }} />
          ))}
        </div>
      )}
    </div>
  )
}
