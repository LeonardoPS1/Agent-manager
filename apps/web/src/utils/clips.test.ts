import { describe, expect, it } from 'vitest'
import {
  ANIM_ROLES,
  ANIM_ROLE_PATTERNS,
  LOOPING_ROLES,
  pickClipForRoles,
  resolveRoleClips,
  scorePattern,
  toCandidate,
  tokenizeClipName
} from './clips'

describe('tokenizeClipName', () => {
  it('splits pack separators, camelCase and digit boundaries', () => {
    expect(tokenizeClipName('Rig_Medium|Walking_A')).toEqual(['rig', 'medium', 'walking', 'a'])
    expect(tokenizeClipName('SitChairIdle')).toEqual(['sit', 'chair', 'idle'])
    expect(tokenizeClipName('Idle_02')).toEqual(['idle', '02'])
  })
})

describe('scorePattern', () => {
  it('matches on word boundaries instead of raw substrings', () => {
    // "Burning" contains "urn", not the token "run": a naive substring match
    // would wrongly claim it as a run clip.
    expect(scorePattern(toCandidate('Running_A'), 'run')).toBeGreaterThan(0)
    expect(scorePattern(toCandidate('Burning'), 'run')).toBe(0)
  })

  it('prefers the base clip over a decorated variant', () => {
    const base = scorePattern(toCandidate('Idle'), 'idle')
    const decorated = scorePattern(toCandidate('Idle_Long_Loop'), 'idle')
    expect(base).toBeGreaterThan(decorated)
  })
})

describe('role pattern coverage', () => {
  it('declares patterns for every role', () => {
    expect(Object.keys(ANIM_ROLE_PATTERNS).sort()).toEqual([...ANIM_ROLES].sort())
  })

  it('keeps one-shot roles out of the looping set', () => {
    expect(LOOPING_ROLES).not.toContain('error')
    expect(LOOPING_ROLES).not.toContain('cheer')
    expect(LOOPING_ROLES).toContain('idle')
  })
})

describe('resolveRoleClips', () => {
  it('assigns the obvious KayKit style clips', () => {
    const resolution = resolveRoleClips([
      'Idle',
      'Walking_A',
      'Running_A',
      'Talking_A',
      'Waving',
      'Cheering',
      'Sitting_Idle',
      'Death'
    ])

    expect(resolution.roles.idle).toBe('Idle')
    expect(resolution.roles.walk).toBe('Walking_A')
    expect(resolution.roles.run).toBe('Running_A')
    expect(resolution.roles.talk).toBe('Talking_A')
    expect(resolution.roles.wave).toBe('Waving')
    expect(resolution.roles.cheer).toBe('Cheering')
    expect(resolution.roles.sit).toBe('Sitting_Idle')
    expect(resolution.roles.error).toBe('Death')
  })

  it('never assigns the same clip to two roles while an alternative exists', () => {
    const resolution = resolveRoleClips(['Idle', 'Idle_Sit'])
    const assigned = Object.values(resolution.roles).filter(Boolean) as string[]
    expect(new Set(assigned).size).toBe(assigned.length)
  })

  it('reports missing roles and unused clips for an empty model', () => {
    const resolution = resolveRoleClips([])
    expect(resolution.missing).toEqual(ANIM_ROLES)
    expect(resolution.used).toEqual([])
    expect(resolution.unused).toEqual([])
  })
})

describe('pickClipForRoles', () => {
  it('walks the preference chain and falls back to idle', () => {
    const resolution = resolveRoleClips(['Idle'])
    const picked = pickClipForRoles(resolution, ['sit', 'idle'])
    expect(picked).toEqual({ role: 'idle', clip: 'Idle' })
  })

  it('returns the most specific role when it exists', () => {
    const resolution = resolveRoleClips(['Idle', 'Sitting_Idle'])
    const picked = pickClipForRoles(resolution, ['sit', 'idle'])
    expect(picked.role).toBe('sit')
  })
})
