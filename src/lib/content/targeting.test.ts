import { describe, it, expect } from "vitest"
import { matchesTargets, type ContentTarget } from "./targeting"

const t = (p: Partial<ContentTarget>): ContentTarget => ({
  target_all: null,
  store_id: null,
  tag_id: null,
  screen_id: null,
  ...p,
})

const STORE = "store-a"
const SCREEN = "screen-1"

describe("matchesTargets — skjerm-målretting", () => {
  it("viser skjerm-målrettet innhold KUN på riktig skjerm", () => {
    const targets = [t({ screen_id: SCREEN })]
    expect(matchesTargets(targets, { storeId: STORE, screenId: SCREEN })).toBe(true)
    expect(matchesTargets(targets, { storeId: STORE, screenId: "screen-2" })).toBe(false)
  })

  it("skjuler skjerm-målrettet innhold uten skjermkontekst (forhåndsvisning / gamle ?store=-URLer)", () => {
    const targets = [t({ screen_id: SCREEN })]
    expect(matchesTargets(targets, { storeId: STORE })).toBe(false)
    expect(matchesTargets(targets, { storeId: STORE, screenId: null })).toBe(false)
  })

  it("skjuler skjerm-målrettet innhold i base-feeden (storeId null)", () => {
    expect(matchesTargets([t({ screen_id: SCREEN })], { storeId: null })).toBe(false)
  })

  it("skjerm-targets har forrang over butikk/tag-rader på samme innslag", () => {
    const targets = [t({ screen_id: SCREEN }), t({ store_id: STORE })]
    // Uten skjermkontekst: butikk-raden redder det IKKE — innslaget er skjerm-spesifikt.
    expect(matchesTargets(targets, { storeId: STORE })).toBe(false)
    expect(matchesTargets(targets, { storeId: STORE, screenId: SCREEN })).toBe(true)
  })

  it("matcher én av flere målrettede skjermer", () => {
    const targets = [t({ screen_id: "screen-1" }), t({ screen_id: "screen-2" })]
    expect(matchesTargets(targets, { storeId: STORE, screenId: "screen-2" })).toBe(true)
    expect(matchesTargets(targets, { storeId: STORE, screenId: "screen-3" })).toBe(false)
  })
})

describe("matchesTargets — eksisterende regler uendret", () => {
  it("target_all treffer alle butikker", () => {
    expect(matchesTargets([t({ target_all: true })], { storeId: STORE })).toBe(true)
  })

  it("butikk-målretting treffer kun valgt butikk", () => {
    const targets = [t({ store_id: STORE })]
    expect(matchesTargets(targets, { storeId: STORE })).toBe(true)
    expect(matchesTargets(targets, { storeId: "store-b" })).toBe(false)
  })

  it("tag-målretting treffer butikker med taggen", () => {
    const targets = [t({ tag_id: "tag-1" })]
    const tagToStores = new Map([["tag-1", new Set([STORE])]])
    expect(matchesTargets(targets, { storeId: STORE, tagToStores })).toBe(true)
    expect(matchesTargets(targets, { storeId: "store-b", tagToStores })).toBe(false)
  })

  it("base-feed (storeId null) viser ikke-skjerm-målrettet innhold", () => {
    expect(matchesTargets([t({ store_id: STORE })], { storeId: null })).toBe(true)
    expect(matchesTargets([], { storeId: null })).toBe(true)
  })

  it("skjerm på en butikk viser vanlig butikk-innhold uendret (screenId satt, ingen screen-targets)", () => {
    const targets = [t({ store_id: STORE })]
    expect(matchesTargets(targets, { storeId: STORE, screenId: SCREEN })).toBe(true)
  })

  it("innhold uten targets vises ikke for en spesifikk butikk", () => {
    expect(matchesTargets([], { storeId: STORE })).toBe(false)
  })
})
