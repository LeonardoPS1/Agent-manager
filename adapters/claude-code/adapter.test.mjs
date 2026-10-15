import { describe, it, expect } from 'vitest'
import { mapHook } from './emit.mjs'
import { mapTranscriptEntry } from './watch-session.mjs'

describe('emit.mjs — mapHook', () => {
  it('maps SessionStart to an idle state + heartbeat', () => {
    const events = mapHook('SessionStart', { session_id: 'abc' })
    expect(events.map((e) => e.type)).toEqual(['state', 'heartbeat'])
    expect(events[0].payload).toEqual({ state: 'idle' })
  })

  it('maps UserPromptSubmit to thinking', () => {
    expect(mapHook('UserPromptSubmit', {})[0]).toEqual({
      type: 'state',
      payload: { state: 'thinking' }
    })
  })

  it('maps PreToolUse to a tool_call plus typing', () => {
    const events = mapHook('PreToolUse', { tool_name: 'Read', tool_input: { file_path: 'a.ts' } })
    expect(events[0].type).toBe('tool_call')
    expect(events[0].payload.name).toBe('Read')
    expect(events[0].payload.args_summary).toContain('a.ts')
    expect(events[1].payload).toEqual({ state: 'typing' })
  })

  it('truncates long tool inputs in args_summary', () => {
    const events = mapHook('PreToolUse', { tool_name: 'Write', tool_input: 'x'.repeat(500) })
    expect(events[0].payload.args_summary.length).toBeLessThanOrEqual(160)
  })

  it('maps SubagentStop to a handoff message back to claude-code', () => {
    const events = mapHook('SubagentStop', { subagent_type: 'general', summary: 'done' })
    expect(events[0].type).toBe('message')
    expect(events[0].payload.to).toBe('claude-code')
    expect(events[0].payload.object).toBe('file')
  })

  it('always includes a task_id on Stop so the event validates', () => {
    const events = mapHook('Stop', { session_id: 'session-1' })
    expect(events[0].type).toBe('task_end')
    expect(events[0].payload.task_id).toBe('session-1')
    expect(events[0].payload.status).toBe('done')
  })

  it('supports the direct shorthand for manual testing', () => {
    expect(mapHook('state', { state: 'sorting' })[0]).toEqual({
      type: 'state',
      payload: { state: 'sorting' }
    })
  })

  it('returns nothing for unknown hooks', () => {
    expect(mapHook('Nope', {})).toEqual([])
  })
})

describe('watch-session.mjs — mapTranscriptEntry', () => {
  it('maps a user turn to thinking', () => {
    expect(mapTranscriptEntry({ type: 'user' })).toEqual([{ type: 'state', payload: { state: 'thinking' } }])
  })

  it('maps an assistant usage block to a usage event', () => {
    const events = mapTranscriptEntry({
      type: 'assistant',
      message: {
        model: 'claude-sonnet',
        usage: { input_tokens: 100, output_tokens: 50 },
        content: [{ type: 'text', text: 'hello' }]
      }
    })
    const usage = events.find((e) => e.type === 'usage')
    expect(usage?.payload).toEqual({
      model: 'claude-sonnet',
      tokens_in: 100,
      tokens_out: 50,
      cost: 0
    })
  })

  it('maps a tool_use block to a tool_call and typing', () => {
    const events = mapTranscriptEntry({
      type: 'assistant',
      message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'b.ts' } }] }
    })
    expect(events.find((e) => e.type === 'tool_call')?.payload.name).toBe('Read')
    expect(events.some((e) => e.type === 'state' && e.payload.state === 'typing')).toBe(true)
  })

  it('surfaces a sub-agent dispatch as a handoff message (linked character)', () => {
    const events = mapTranscriptEntry({
      type: 'assistant',
      message: {
        content: [
          {
            type: 'tool_use',
            name: 'Task',
            input: { subagent_type: 'general', description: 'Audit the schema' }
          }
        ]
      }
    })
    const msg = events.find((e) => e.type === 'message')
    expect(msg?.payload.to).toBe('general')
    expect(msg?.payload.content).toBe('Audit the schema')
    expect(msg?.payload.object).toBe('file')
  })

  it('ignores malformed entries', () => {
    expect(mapTranscriptEntry(null)).toEqual([])
    expect(mapTranscriptEntry('nope')).toEqual([])
    expect(mapTranscriptEntry({ type: 'summary' })).toEqual([])
  })
})
