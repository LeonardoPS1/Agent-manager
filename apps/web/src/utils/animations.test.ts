import { describe, it, expect } from 'vitest'
import { STATE_TO_ANIM, mapStateToAnim } from './animations'
import type { AgentState } from '../store/useStore'

const ALL_STATES: AgentState[] = [
  'idle',
  'thinking',
  'typing',
  'reading',
  'sorting',
  'printing',
  'saving',
  'meeting',
  'calling',
  'error',
  'done'
]

describe('state → animation mapping', () => {
  it('defines a mapping for every agent state', () => {
    for (const state of ALL_STATES) {
      expect(STATE_TO_ANIM[state], `missing mapping for ${state}`).toBeDefined()
    }
  })

  it('never maps to a walk clip directly (walking is a travel detail)', () => {
    for (const state of ALL_STATES) {
      expect(STATE_TO_ANIM[state].clip).not.toBe('walk')
    }
  })

  it('returns the right clip for each state', () => {
    expect(mapStateToAnim('idle').clip).toBe('idle')
    expect(mapStateToAnim('thinking').clip).toBe('thinking')
    expect(mapStateToAnim('typing').clip).toBe('typing')
    expect(mapStateToAnim('reading').clip).toBe('reading')
    expect(mapStateToAnim('sorting').clip).toBe('sorting')
    expect(mapStateToAnim('printing').clip).toBe('printing')
    expect(mapStateToAnim('saving').clip).toBe('saving')
    expect(mapStateToAnim('meeting').clip).toBe('meeting')
    expect(mapStateToAnim('calling').clip).toBe('calling')
    expect(mapStateToAnim('error').clip).toBe('error')
    expect(mapStateToAnim('done').clip).toBe('celebrate')
  })

  it('sends agents to the right room for travel states', () => {
    expect(mapStateToAnim('sorting').target).toBe('archive')
    expect(mapStateToAnim('printing').target).toBe('printer')
    expect(mapStateToAnim('saving').target).toBe('server-rack')
    expect(mapStateToAnim('meeting').target).toBe('meeting')
  })

  it('keeps desk-bound states at the desk (no target)', () => {
    for (const state of ['thinking', 'typing', 'reading', 'calling', 'error', 'done', 'idle'] as AgentState[]) {
      expect(mapStateToAnim(state).target).toBeUndefined()
    }
  })

  it('falls back to idle when the state is unknown or missing', () => {
    expect(mapStateToAnim(undefined)).toEqual({ clip: 'idle', loop: true })
    expect(mapStateToAnim('nonexistent' as AgentState)).toEqual({ clip: 'idle', loop: true })
  })
})
