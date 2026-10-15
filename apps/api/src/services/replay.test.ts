import { describe, it, expect } from 'vitest'
import { shouldDeliver, parseSince, sortReplayAsc } from './replay.js'

describe('shouldDeliver (WS subscription filtering)', () => {
  it('delivers every event to a global subscriber', () => {
    expect(shouldDeliver(null, 'atlas')).toBe(true)
    expect(shouldDeliver(undefined, 'nova')).toBe(true)
    expect(shouldDeliver('', 'vector')).toBe(true)
  })

  it('delivers only matching events to an agent-scoped subscriber', () => {
    expect(shouldDeliver('atlas', 'atlas')).toBe(true)
    expect(shouldDeliver('atlas', 'nova')).toBe(false)
  })

  it('drops events with no agent for an agent-scoped subscriber', () => {
    expect(shouldDeliver('atlas', null)).toBe(false)
    expect(shouldDeliver('atlas', undefined)).toBe(false)
  })
})

describe('parseSince (replay cursor)', () => {
  it('parses a numeric cursor', () => {
    expect(parseSince('42')).toBe(42)
    expect(parseSince(42)).toBe(42)
  })

  it('floors fractional values', () => {
    expect(parseSince('42.9')).toBe(42)
  })

  it('falls back to 0 for missing or invalid cursors', () => {
    expect(parseSince(null)).toBe(0)
    expect(parseSince(undefined)).toBe(0)
    expect(parseSince('')).toBe(0)
    expect(parseSince('abc')).toBe(0)
    expect(parseSince('-5')).toBe(0)
    expect(parseSince('0')).toBe(0)
  })
})

describe('sortReplayAsc', () => {
  it('orders replayed events by ascending id', () => {
    const rows = [
      { id: 30, agentId: 'atlas' },
      { id: 10, agentId: 'nova' },
      { id: 20, agentId: 'atlas' }
    ]
    expect(sortReplayAsc(rows).map((r) => r.id)).toEqual([10, 20, 30])
  })

  it('does not mutate the input array', () => {
    const rows = [{ id: 2 }, { id: 1 }]
    sortReplayAsc(rows)
    expect(rows.map((r) => r.id)).toEqual([2, 1])
  })
})
