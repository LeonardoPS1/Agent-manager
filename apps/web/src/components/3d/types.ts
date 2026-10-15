import type { Agent, AgentState } from '../../store/useStore'

export type { CharacterStatus } from '../../utils/characters'
export { CHARACTER_STATUS_LABELS, CHARACTER_STATUS_WARNING } from '../../utils/characters'

export interface CharacterProps {
  agent: Agent
  state: AgentState
  position: [number, number, number]
  rotationY?: number
  selected?: boolean
  speech?: string
  onSelect?: () => void
}
