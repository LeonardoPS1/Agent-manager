const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000'

/** All REST routes live under the /v1 prefix. */
const BASE = `${API_URL}/v1`

export interface AgentDTO {
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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text}`)
  }
  return (await res.json()) as T
}

export const api = {
  listAgents: () => req<AgentDTO[]>('/agents'),
  getAgent: (id: string) => req<AgentDTO>(`/agents/${id}`),
  createAgent: (body: Partial<AgentDTO>) =>
    req<{ agent: AgentDTO; token: string }>('/agents', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  updateAgent: (id: string, patch: Partial<AgentDTO>) =>
    req<AgentDTO>(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteAgent: (id: string) => req<{ ok: boolean }>(`/agents/${id}`, { method: 'DELETE' }),
  assignTask: (id: string, body: { title: string; priority?: string; context?: string }) =>
    req(`/agents/${id}/assign`, { method: 'POST', body: JSON.stringify(body) }),
  pauseAgent: (id: string) => req(`/agents/${id}/pause`, { method: 'POST' }),
  resumeAgent: (id: string) => req(`/agents/${id}/resume`, { method: 'POST' }),
  rotateToken: (id: string) => req<{ token: string }>(`/agents/${id}/token/rotate`, { method: 'POST' }),
  listEvents: (params?: { agent_id?: string; type?: string; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.agent_id) q.set('agent_id', params.agent_id)
    if (params?.type) q.set('type', params.type)
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    return req<unknown[]>(`/events${qs ? `?${qs}` : ''}`)
  },
  getLayout: () => req<unknown>('/layout'),
  saveLayout: (layout: unknown) => req('/layout', { method: 'POST', body: JSON.stringify({ layout }) })
}

export { API_URL }
