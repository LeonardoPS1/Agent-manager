/**
 * Clip resolution: turns the abstract performance roles used by the office
 * state machine into the clip names that actually exist inside a loaded model.
 *
 * Asset packs name their clips however they like (`Idle`, `Idle_A`,
 * `Rig|Idle`, `CharacterArmature|Idle`). Rather than hardcoding a mapping that
 * breaks every time a pack updates, we score every available clip against a
 * pattern list and assign the best match per role.
 */

import type { AnimRole } from './animations'

export interface ClipCandidate {
  name: string
  tokens: string[]
  normalized: string
}

export type ResolvedRoles = Record<AnimRole, string | null>

export interface ClipResolution {
  roles: ResolvedRoles
  /** Roles that found no clip at all. */
  missing: AnimRole[]
  /** Clips that matched at least one role. */
  used: string[]
  /** Clips nobody claimed; handy when tuning the patterns below. */
  unused: string[]
}

/**
 * Ordered by specificity: earlier patterns win ties, so the most specific
 * words come first inside each role's list.
 */
export const ANIM_ROLE_PATTERNS: Record<AnimRole, string[]> = {
  idle: ['idle', 'standing', 'stand', 'breathing', 'breathe'],
  walk: ['walk', 'walking', 'move', 'moving', 'step', 'locomotion'],
  run: ['run', 'running', 'sprint', 'jog', 'dash', 'sprintloop'],
  sit: ['sit', 'sitting', 'seated', 'seatedidle', 'chair', 'office', 'chairidle'],
  type: ['typing', 'type', 'keyboard', 'laptop', 'computer', 'typeloop'],
  write: ['write', 'writing', 'notebook', 'pen', 'pencil', 'papers'],
  read: ['read', 'reading', 'book', 'scroll', 'document', 'map', 'paper'],
  think: ['think', 'thinking', 'ponder', 'wonder', 'idea', 'confused', 'shrug'],
  talk: [
    'talk', 'talking', 'speak', 'speaking', 'conversation', 'converse', 'chat',
    'phone', 'calling', 'call', 'answer', 'sitconversation'
  ],
  wave: ['wave', 'waving', 'greet', 'greeting', 'hello', 'hi'],
  cheer: [
    'cheer', 'cheering', 'celebrate', 'celebration', 'victory', 'success',
    'happy', 'dance', 'jump', 'dancing', 'yes', 'thumbsup'
  ],
  carry: ['carry', 'carrying', 'hold', 'holding', 'pickup', 'pick', 'push', 'pull', 'box', 'crate', 'lift'],
  error: ['hit', 'hurt', 'death', 'die', 'dead', 'stun', 'stunned', 'block', 'blocking', 'damage', 'knockdown', 'fall', 'no', 'sad'],
  sleep: ['sleep', 'sleeping', 'rest', 'tired', 'yawn', 'nap', 'lie', 'laying']
}

export const ANIM_ROLES: AnimRole[] = Object.keys(ANIM_ROLE_PATTERNS) as AnimRole[]

/** Roles that make sense to loop; one-shot roles clamp on their last frame. */
export const LOOPING_ROLES: AnimRole[] = ['idle', 'walk', 'run', 'sit', 'type', 'write', 'read', 'think', 'talk', 'carry', 'sleep']

/** Human readable labels for the UI. */
export const ANIM_ROLE_LABELS: Record<AnimRole, string> = {
  idle: 'Idle',
  walk: 'Walk',
  run: 'Run',
  sit: 'Sit',
  type: 'Typing',
  write: 'Writing',
  read: 'Reading',
  think: 'Thinking',
  talk: 'Talking',
  wave: 'Waving',
  cheer: 'Celebrating',
  carry: 'Carrying',
  error: 'Error',
  sleep: 'Resting'
}

/** Splits `Rig_Medium|Idle_A` / `CharacterArmature|Idle` / `Idle` into tokens. */
export function tokenizeClipName(name: string): string[] {
  return name
    .replace(/[|/]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])([0-9])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

export function toCandidate(name: string): ClipCandidate {
  const tokens = tokenizeClipName(name)
  return { name, tokens, normalized: tokens.join('') }
}

/**
 * Scores a single pattern against a clip. Word boundaries come from
 * tokenisation, so `run` matches `Running` but never `Burning`.
 */
export function scorePattern(candidate: ClipCandidate, pattern: string): number {
  const wanted = pattern.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (wanted.length === 0) return 0

  const { tokens, normalized } = candidate
  let score = 0

  if (normalized === wanted) score = 1000
  else if (tokens.includes(wanted)) score = 900
  else if (wanted.length >= 3 && tokens.some((token) => token.startsWith(wanted))) score = 700
  else if (normalized.startsWith(wanted)) score = 600
  else if (wanted.length >= 4 && normalized.includes(wanted)) score = 400
  else if (wanted.length >= 6 && tokens.some((token) => token.includes(wanted))) score = 300

  if (score === 0) return 0

  // Prefer the base clip over decorated variants (`Idle` over `Idle_Large_02`).
  score -= candidate.name.length * 0.2
  score -= tokens.length * 2

  return score
}

export function scoreRole(candidate: ClipCandidate, role: AnimRole): number {
  let best = 0
  const patterns = ANIM_ROLE_PATTERNS[role] ?? []
  for (let i = 0; i < patterns.length; i++) {
    const raw = scorePattern(candidate, patterns[i])
    if (raw === 0) continue
    // Patterns are ordered by relevance, so an earlier pattern wins ties.
    const weighted = raw - i * 0.5
    if (weighted > best) best = weighted
  }
  return best
}

interface Claim {
  role: AnimRole
  name: string
  score: number
}

/**
 * Assigns one clip per role using a greedy best-score pass, then a second pass
 * that allows clip reuse so a sparse pack still covers every role it can.
 */
export function resolveRoleClips(clipNames: string[]): ClipResolution {
  const candidates = clipNames.map(toCandidate)
  const roles: ResolvedRoles = {} as ResolvedRoles
  for (const role of ANIM_ROLES) roles[role] = null

  const claims: Claim[] = []
  for (const role of ANIM_ROLES) {
    for (const candidate of candidates) {
      const score = scoreRole(candidate, role)
      if (score > 0) claims.push({ role, name: candidate.name, score })
    }
  }

  claims.sort((a, b) => b.score - a.score || a.name.length - b.name.length || a.name.localeCompare(b.name))

  const takenClips = new Set<string>()
  for (const claim of claims) {
    if (roles[claim.role] !== null || takenClips.has(claim.name)) continue
    roles[claim.role] = claim.name
    takenClips.add(claim.name)
  }

  // Second pass: reuse clips for roles that are still empty.
  for (const claim of claims) {
    if (roles[claim.role] !== null) continue
    roles[claim.role] = claim.name
  }

  const missing = ANIM_ROLES.filter((role) => roles[role] === null)
  const used = Array.from(new Set(Object.values(roles).filter(Boolean) as string[]))
  const usedSet = new Set(used)
  const unused = clipNames.filter((name) => !usedSet.has(name))

  return { roles, missing, used, unused }
}

/**
 * Follows a role preference chain (most specific first) and returns the first
 * clip that exists. Falls back to idle, then to anything at all.
 */
export function pickClipForRoles(
  resolution: ClipResolution,
  chain: AnimRole[]
): { role: AnimRole | null; clip: string | null } {
  for (const role of chain) {
    const clip = resolution.roles[role]
    if (clip) return { role, clip }
  }
  const idle = resolution.roles.idle
  if (idle) return { role: 'idle', clip: idle }
  const anyUsed = resolution.used[0]
  if (anyUsed) {
    const entry = (Object.entries(resolution.roles) as [AnimRole, string | null][]).find(
      ([, clip]) => clip === anyUsed
    )
    return { role: entry?.[0] ?? null, clip: anyUsed }
  }
  return { role: null, clip: null }
}

/** Keeps the first clip per name across several merged animation libraries. */
export function mergeAnimationClips(
  sources: { name: string }[][]
): { name: string }[] {
  const seen = new Set<string>()
  const merged: { name: string }[] = []
  for (const list of sources) {
    for (const clip of list) {
      if (seen.has(clip.name)) continue
      seen.add(clip.name)
      merged.push(clip)
    }
  }
  return merged
}
