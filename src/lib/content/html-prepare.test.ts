import { describe, it, expect } from "vitest"
import { prepareSignageHtml, HTML_MAX_BYTES } from "./html-prepare"

function ok(raw: string): string {
  const res = prepareSignageHtml(raw)
  if (!res.ok || !res.html) throw new Error(`Forventet ok, fikk: ${res.error}`)
  return res.html
}

describe("prepareSignageHtml — bevarer app-innhold (JS er lov, sandkassen sikrer)", () => {
  it("BEHOLDER <script> (motsatt av gammel sanering)", () => {
    const out = ok(`<div id="a"></div><script>document.getElementById('a').textContent='hei'</script>`)
    expect(out).toContain("<script>")
    expect(out).toContain("document.getElementById('a')")
  })

  it("beholder inline event-handlere og CSS/@keyframes", () => {
    const out = ok(`<style>@keyframes p{to{transform:scale(1.1)}}</style><div onclick="x()" style="animation:p 2s infinite">x</div>`)
    expect(out).toContain("@keyframes p")
    expect(out).toContain("onclick=\"x()\"")
    expect(out).toContain("animation:p 2s infinite")
  })

  it("beholder eksterne referanser (nett er tillatt, jailet i sandkasse)", () => {
    const out = ok(`<script src="https://cdn.example/app.js"></script><img src="https://x/y.png">`)
    expect(out).toContain("https://cdn.example/app.js")
    expect(out).toContain("https://x/y.png")
  })
})

describe("prepareSignageHtml — dokument-håndtering", () => {
  it("pakker et fragment i et fullt dokument med full-bleed-reset", () => {
    const out = ok(`<h1>Tilbud</h1>`)
    expect(out.toLowerCase()).toContain("<!doctype html>")
    expect(out).toMatch(/overflow:\s*hidden/)
    expect(out).toContain("<h1>Tilbud</h1>")
  })

  it("lar et fullt dokument stå urørt (unngår quirks-mode)", () => {
    const doc = `<!doctype html><html><head><title>x</title></head><body><p>hei</p></body></html>`
    const out = ok(doc)
    expect(out).toBe(doc)
  })
})

describe("prepareSignageHtml — validering", () => {
  it("avviser tom fil", () => {
    expect(prepareSignageHtml("").ok).toBe(false)
    expect(prepareSignageHtml("   ").ok).toBe(false)
  })

  it("avviser fil over grensa", () => {
    const big = "<div>" + "a".repeat(HTML_MAX_BYTES + 10) + "</div>"
    const res = prepareSignageHtml(big)
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/maks 4 MB/)
  })
})
