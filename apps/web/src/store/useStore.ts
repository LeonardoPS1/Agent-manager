import { create } from 'zustand'
import type { CharacterStatus } from '../utils/characters'

export type AgentState =
  | 'thinking' | 'typing' | 'reading' | 'sorting' | 'printing'
  | 'saving' | 'meeting' | 'calling' | 'error' | 'done' | 'idle'

export interface Agent {
  id: string
  slug: string
  name: string
  role?: string
  model?: string
  systemPrompt?: string
  deskId?: string
  appearance?: Record<string, unknown>
  webhookUrl?: string
  isActive?: boolean
}

export interface OfficeEvent {
  id: number
  agentId: string
  ts: string
  type: string
  payload: Record<string, any>
  source?: string
}

export interface ChatMessage {
  from: string
  to: string
  content: string
  ts: string
}

interface StoreState {
  agents: Record<string, Agent>
  agentState: Record<string, AgentState>
  currentTask: Record<string, { id: string; title: string; progress: number } | undefined>
  events: OfficeEvent[]
  messages: ChatMessage[]
  selectedAgentId: string | null
  connected: boolean
  theme: 'dark' | 'light'
  editMode: boolean
  replayMode: boolean
  replayIndex: number
  /** Runtime animation status per agent, reported by the 3D characters. */
  characterStatus: Record<string, CharacterStatus>

  setAgents: (agents: Agent[]) => void
  upsertAgent: (agent: Agent) => void
  removeAgent: (id: string) => void
  applyEvent: (event: OfficeEvent) => void
  addEvents: (events: OfficeEvent[]) => void
  selectAgent: (id: string | null) => void
  setConnected: (v: boolean) => void
  toggleTheme: () => void
  toggleEditMode: () => void
  toggleReplayMode: () => void
  setReplayIndex: (i: number) => void
  setCharacterStatus: (agentId: string, status: CharacterStatus) => void
}

const MAX_EVENTS = 2000
const MAX_MESSAGES = 500

export const useStore = create<StoreState>((set, get) => ({
  agents: {},
  agentState: {},
  currentTask: {},
  events: [],
  messages: [],
  selectedAgentId: null,
  connected: false,
  theme: 'dark',
  editMode: false,
  replayMode: false,
  replayIndex: 0,
  characterStatus: {},

  setAgents: (agents) =>
    set({ agents: Object.fromEntries(agents.map((a) => [a.id, a])) }),

  upsertAgent: (agent) =>
    set((s) => ({ agents: { ...s.agents, [agent.id]: { ...s.agents[agent.id], ...agent } } })),

  removeAgent: (id) =>
    set((s) => {
      const agents = { ...s.agents }
      delete agents[id]
      const characterStatus = { ...s.characterStatus }
      delete characterStatus[id]
      return { agents, characterStatus, selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId }
    }),

  addEvents: (incoming) =>
    set((s) => ({ events: [...s.events, ...incoming].slice(-MAX_EVENTS) })),

  applyEvent: (event) => {
    const s = get()
    const agentId = event.agentId
    const agentState = { ...s.agentState }
    const currentTask = { ...s.currentTask }
    let messages = s.messages

    switch (event.type) {
      case 'state': {
        const state = event.payload?.state as AgentState | undefined
        if (state) agentState[agentId] = state
        break
      }
      case 'task_start': {
        const p = event.payload || {}
        currentTask[agentId] = {
          id: String(p.task_id ?? ''),
          title: String(p.title ?? ''),
          progress: 0
        }
        agentState[agentId] = 'typing'
        break
      }
      case 'task_end': {
        delete currentTask[agentId]
        const status = event.payload?.status
        agentState[agentId] = status === 'done' ? 'done' : status === 'failed' ? 'error' : 'idle'
        break
      }
      case 'message': {
        const p = event.payload || {}
        messages = [
          ...messages,
          { from: String(p.from ?? ''), to: String(p.to ?? ''), content: String(p.content ?? ''), ts: event.ts }
        ].slice(-MAX_MESSAGES)
        break
      }
      default:
        break
    }

    set({
      agentState,
      currentTask,
      messages,
      events: [...s.events, event].slice(-MAX_EVENTS)
    })
  },

  selectAgent: (id) => set({ selectedAgentId: id }),
  setConnected: (v) => set({ connected: v }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),
  toggleReplayMode: () => set((s) => ({ replayMode: !s.replayMode })),
  setReplayIndex: (i) => set({ replayIndex: i }),

  setCharacterStatus: (agentId, status) =>
    set((s) =>
      s.characterStatus[agentId] === status
        ? s
        : { characterStatus: { ...s.characterStatus, [agentId]: status } }
    )
}))
