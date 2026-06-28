import { describe, it, expect } from 'vitest'
import type { ModulePlacement, BuilderState } from './types'

function addPlacement(state: BuilderState, placement: ModulePlacement): BuilderState {
  return { ...state, placements: [...state.placements, placement] }
}

function removePlacement(state: BuilderState, id: string): BuilderState {
  return { ...state, placements: state.placements.filter((p) => p.id !== id), selectedId: state.selectedId === id ? null : state.selectedId }
}

function updatePlacementFields(state: BuilderState, id: string, fields: Record<string, unknown>): BuilderState {
  return {
    ...state,
    placements: state.placements.map((p) => p.id === id ? { ...p, fields: { ...p.fields, ...fields } } : p),
  }
}

const makePlacement = (id: string): ModulePlacement => ({
  id, moduleKey: 'internal-news', moduleName: 'Interne nyheter', fields: {}, durationSeconds: 10
})

const makeState = (): BuilderState => ({
  contentItemId: null, name: 'Test', placements: [], selectedId: null, saveStatus: 'idle'
})

describe('addPlacement', () => {
  it('legger til plassering i slutten av listen', () => {
    const state = makeState()
    const result = addPlacement(state, makePlacement('a'))
    expect(result.placements).toHaveLength(1)
    expect(result.placements[0].id).toBe('a')
  })
})

describe('removePlacement', () => {
  it('fjerner plassering med riktig id', () => {
    let state = addPlacement(makeState(), makePlacement('a'))
    state = addPlacement(state, makePlacement('b'))
    const result = removePlacement(state, 'a')
    expect(result.placements).toHaveLength(1)
    expect(result.placements[0].id).toBe('b')
  })
  it('nullstiller selectedId hvis valgt modul slettes', () => {
    let state = addPlacement(makeState(), makePlacement('a'))
    state = { ...state, selectedId: 'a' }
    const result = removePlacement(state, 'a')
    expect(result.selectedId).toBeNull()
  })
})

describe('updatePlacementFields', () => {
  it('merger nye felter med eksisterende', () => {
    const state = addPlacement(makeState(), { ...makePlacement('a'), fields: { title: 'Gammel' } })
    const result = updatePlacementFields(state, 'a', { title: 'Ny', body: 'Tekst' })
    expect(result.placements[0].fields).toEqual({ title: 'Ny', body: 'Tekst' })
  })
})
