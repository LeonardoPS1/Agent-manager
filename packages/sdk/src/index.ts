/**
 * @aicore-office/sdk — minimal TypeScript client for Aicore Office.
 *
 * Usage:
 *   const office = new OfficeClient({ url, agentId, token })
 *   await office.emit('state', { state: 'typing' })
 *   await office.usage({ model: 'mistral', tokens_in: 120, tokens_out: 340, cost: 0.001 })
 *   office.onCommand((cmd) => console.log(cmd))
 */

export type AgentState =
  | 'thinking' | 'typing' | 'reading' | 'sorting' | 'printing'
  | 'saving' | 'meeting' | 'calling' | 'error' | 'done' | 'idle'

export type EventType =
  | 'state' | 'task_start' | 'task_end' | 'message'
  | 'tool_call' | 'usage' | 'heartbeat' | 'command_ack' | 'layout_update'

export interface OfficeClientOptions {
  url: string
  agentId: string
  token?: string
  /** Emit a heartbeat every N ms (0 / undefined = disabled). */
  heartbeatMs?: number
}

export interface IncomingEvent {
  id?: number
  type: EventType | 'assign_task' | 'pause' | 'resume' | 'chat'
  payload?: Record<string, unknown>
  [key: string]: unknown
}

export class OfficeClient {
  private readonly url: string
  readonly agentId: string
  private readonly token?: string
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastEventId = 0
  private ws: WebSocket | null = null
  private readonly commandHandlers: ((cmd: IncomingEvent) => void)[] = []

  constructor(opts: OfficeClientOptions) {
    this.url = opts.url.replace(/\/$/, '')
    this.agentId = opts.agentId
    this.token = opts.token
    if (opts.heartbeatMs && opts.heartbeatMs > 0) this.startHeartbeat(opts.heartbeatMs)
  }

  /** Emit any event to POST /v1/events. Resolves with the created event id. */
  async emit(type: EventType, payload: Record<string, unknown> = {}): Promise<number> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.token) headers.Authorization = `Bearer ${this.token}`

    const res = await fetch(`${this.url}/v1/events`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agent_id: this.agentId,
        type,
        payload,
        ts: new Date().toISOString(),
        source: 'sdk'
      })
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`OfficeClient.emit(${type}) failed: ${res.status} ${text}`)
    }
    const data = (await res.json()) as { event_id: number }
    return data.event_id
  }

  /** Convenience: emit a `state` event (drives the character animation). */
  state(state: AgentState) {
    return this.emit('state', { state })
  }

  /** Convenience: emit a `usage` event (tokens + optional cost). */
  usage(u: { model: string; tokens_in: number; tokens_out: number; cost?: number; request_id?: string }) {
    return this.emit('usage', { ...u })
  }

  /** Convenience: emit a `tool_call` event. */
  tool(name: string, argsSummary: string, ok = true) {
    return this.emit('tool_call', { name, args_summary: argsSummary, ok })
  }

  /** Convenience: emit a `message` / handoff to another agent (by slug or name). */
  message(to: string, content: string, object: 'file' | 'link' | 'handoff' | 'note' = 'note') {
    return this.emit('message', { from: this.agentId, to, content, object })
  }

  /** Emit a heartbeat. */
  heartbeat() {
    return this.emit('heartbeat', { ts: Date.now() })
  }

  /** Start / restart the heartbeat timer. */
  startHeartbeat(ms: number) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.heartbeatTimer = setInterval(() => {
      this.heartbeat().catch(() => undefined)
    }, ms)
  }

  /**
   * Connect the WebSocket and call `handler` for every incoming event
   * (including server commands: assign_task / pause / resume / chat).
   */
  onCommand(handler: (cmd: IncomingEvent) => void): void {
    this.commandHandlers.push(handler)
    if (this.ws) return

    const params = new URLSearchParams({ agent_id: this.agentId })
    if (this.token) params.set('token', this.token)
    if (this.lastEventId > 0) params.set('since', String(this.lastEventId))

    const wsUrl = `${this.url.replace(/^http/, 'ws')}/v1/stream?${params.toString()}`
    const ws = new WebSocket(wsUrl)
    this.ws = ws

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(String(ev.data)) as IncomingEvent
        if (typeof data.id === 'number') this.lastEventId = data.id
        for (const h of this.commandHandlers) h(data)
      } catch {
        /* ignore malformed frames */
      }
    }
  }

  /** Close the socket and stop timers. */
  close() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    this.ws?.close()
  }
}

export default OfficeClient
