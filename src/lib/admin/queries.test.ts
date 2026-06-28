import { describe, it, expect } from 'vitest'
import { formatLastSeen, getScreenStatusColor } from './queries'

describe('formatLastSeen', () => {
  it('returnerer "Akkurat nå" for timestamps under 1 minutt siden', () => {
    const now = new Date()
    expect(formatLastSeen(now.toISOString())).toBe('Akkurat nå')
  })

  it('returnerer minutter for timestamps 1-59 min siden', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatLastSeen(fiveMinutesAgo.toISOString())).toBe('5 min siden')
  })

  it('returnerer timer for timestamps over 60 min siden', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    expect(formatLastSeen(twoHoursAgo.toISOString())).toBe('2 timer siden')
  })

  it('returnerer "Aldri" for null', () => {
    expect(formatLastSeen(null)).toBe('Aldri')
  })
})

describe('getScreenStatusColor', () => {
  it('returnerer red for inactive status', () => {
    expect(getScreenStatusColor('inactive', new Date().toISOString())).toBe('red')
  })

  it('returnerer red for null heartbeat', () => {
    expect(getScreenStatusColor('active', null)).toBe('red')
  })

  it('returnerer green for heartbeat under 3 min siden', () => {
    const recent = new Date(Date.now() - 2 * 60 * 1000)
    expect(getScreenStatusColor('active', recent.toISOString())).toBe('green')
  })

  it('returnerer yellow for heartbeat 3-15 min siden', () => {
    const medium = new Date(Date.now() - 10 * 60 * 1000)
    expect(getScreenStatusColor('active', medium.toISOString())).toBe('yellow')
  })

  it('returnerer red for heartbeat over 15 min siden', () => {
    const old = new Date(Date.now() - 30 * 60 * 1000)
    expect(getScreenStatusColor('active', old.toISOString())).toBe('red')
  })
})
