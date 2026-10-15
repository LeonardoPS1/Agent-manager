import type { AgentState } from '../store/useStore'

export type AnimClip =
  | 'idle' | 'walk' | 'thinking' | 'typing' | 'reading' | 'sorting'
  | 'printing' | 'saving' | 'meeting' | 'calling' | 'error' | 'celebrate'

/**
 * Maps an agent state (from a real event) to the animation clip
 * that should play in the 3D scene, plus whether the agent must
 * move to another location first.
 */
export interface AnimMapping {
  clip: AnimClip
  target?: 'printer' | 'archive' | 'server-rack' | 'meeting' | 'kitchen' | 'desk'
  loop: boolean
}

export const STATE_TO_ANIM: Record<AgentState, AnimMapping> = {
  idle: { clip: 'idle', loop: true },
  thinking: { clip: 'thinking', loop: true },
  typing: { clip: 'typing', loop: true },
  reading: { clip: 'reading', loop: true },
  sorting: { clip: 'sorting', target: 'archive', loop: true },
  printing: { clip: 'printing', target: 'printer', loop: false },
  saving: { clip: 'saving', target: 'server-rack', loop: false },
  meeting: { clip: 'meeting', target: 'meeting', loop: true },
  calling: { clip: 'calling', loop: true },
  error: { clip: 'error', loop: false },
  done: { clip: 'celebrate', loop: false }
}

export function mapStateToAnim(state: AgentState | undefined): AnimMapping {
  if (!state) return { clip: 'idle', loop: true }
  return STATE_TO_ANIM[state] ?? { clip: 'idle', loop: true }
}

// --- Performance roles (Phase 2) ------------------------------------------

/**
 * Roles are rig-agnostic. Asset packs name their clips however they like, so a
 * state maps to a *preference chain* of roles and `resolveRoleClips()` in
 * `clips.ts` finds the first one the loaded model actually provides.
 */
export type AnimRole =
  | 'idle' | 'walk' | 'run' | 'sit' | 'type' | 'write' | 'read'
  | 'think' | 'talk' | 'wave' | 'cheer' | 'carry' | 'error' | 'sleep'

export const STATE_TO_ROLES: Record<AgentState, AnimRole[]> = {
  idle: ['idle', 'sit'],
  thinking: ['think', 'read', 'idle'],
  typing: ['type', 'write', 'talk', 'idle'],
  reading: ['read', 'write', 'think', 'idle'],
  sorting: ['carry', 'walk', 'idle'],
  printing: ['walk', 'carry', 'idle'],
  saving: ['type', 'write', 'idle'],
  meeting: ['talk', 'idle', 'sit'],
  calling: ['talk', 'wave', 'idle'],
  error: ['error', 'idle'],
  done: ['cheer', 'wave', 'idle']
}

export function stateToRoles(state: AgentState | undefined): AnimRole[] {
  if (!state) return STATE_TO_ROLES.idle
  return STATE_TO_ROLES[state] ?? STATE_TO_ROLES.idle
}

/** Status colour per state, shared by the 3D scene and the UI panels. */
export const STATE_COLORS: Record<AgentState, string> = {
  idle: '#94a3b8',
  thinking: '#a78bfa',
  typing: '#60a5fa',
  reading: '#38bdf8',
  sorting: '#f59e0b',
  printing: '#f472b6',
  saving: '#22c55e',
  meeting: '#14b8a6',
  calling: '#06b6d4',
  error: '#ef4444',
  done: '#84cc16'
}

/** Short labels used in the agent list and panel headers. */
export const STATE_LABELS: Record<AgentState, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  typing: 'Typing',
  reading: 'Reading',
  sorting: 'Sorting',
  printing: 'Printing',
  saving: 'Saving',
  meeting: 'Meeting',
  calling: 'Calling',
  error: 'Error',
  done: 'Done'
}
