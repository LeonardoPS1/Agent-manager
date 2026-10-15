import { describe, it, expect } from 'vitest'
import { EventSchema, StateValue, EventType, StateEventSchema } from './events.js'

describe('StateValue', () => {
  it('accepts every documented state', () => {
    const states = [
      'thinking',
      'typing',
      'reading',
      'sorting',
      'printing',
      'saving',
      'meeting',
      'calling',
      'error',
      'done',
      'idle'
    ]
    for (const state of states) {
      expect(StateValue.safeParse(state).success).toBe(true)
    }
  })

  it('rejects unknown states', () => {
    expect(StateValue.safeParse('dancing').success).toBe(false)
  })
})

describe('EventType', () => {
  it('accepts every documented event type', () => {
    for (const type of [
      'state',
      'task_start',
      'task_end',
      'message',
      'tool_call',
      'usage',
      'heartbeat',
      'command_ack',
      'layout_update'
    ]) {
      expect(EventType.safeParse(type).success).toBe(true)
    }
  })
})

describe('EventSchema', () => {
  it('validates a state event', () => {
    const result = EventSchema.safeParse({
      agent_id: 'atlas',
      type: 'state',
      payload: { state: 'typing' },
      source: 'n8n'
    })
    expect(result.success).toBe(true)
  })

  it('validates a usage event', () => {
    const result = EventSchema.safeParse({
      agent_id: 'atlas',
      type: 'usage',
      payload: { model: 'mistral', tokens_in: 10, tokens_out: 20, cost: 0.0001 }
    })
    expect(result.success).toBe(true)
  })

  it('validates a message (handoff) event', () => {
    const result = EventSchema.safeParse({
      agent_id: 'nova',
      type: 'message',
      payload: { from: 'Atlas', to: 'Nova', content: 'Passing the report', object: 'file' }
    })
    expect(result.success).toBe(true)
  })

  it('rejects a state event with an unknown state', () => {
    const result = EventSchema.safeParse({
      agent_id: 'atlas',
      type: 'state',
      payload: { state: 'vibing' }
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown event type', () => {
    const result = EventSchema.safeParse({
      agent_id: 'atlas',
      type: 'teleport',
      payload: {}
    })
    expect(result.success).toBe(false)
  })

  it('rejects an event without an agent_id', () => {
    const result = EventSchema.safeParse({ type: 'state', payload: { state: 'idle' } })
    expect(result.success).toBe(false)
  })

  it('rejects a task_start without a task_id', () => {
    const result = EventSchema.safeParse({
      agent_id: 'atlas',
      type: 'task_start',
      payload: { title: 'Report' }
    })
    expect(result.success).toBe(false)
  })

  it('requires a valid ISO datetime for ts', () => {
    expect(
      StateEventSchema.safeParse({
        agent_id: 'atlas',
        type: 'state',
        payload: { state: 'idle' },
        ts: '2026-01-01T00:00:00.000Z'
      }).success
    ).toBe(true)

    expect(
      StateEventSchema.safeParse({
        agent_id: 'atlas',
        type: 'state',
        payload: { state: 'idle' },
        ts: 'yesterday'
      }).success
    ).toBe(false)
  })
})
