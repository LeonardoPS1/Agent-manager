import { z } from 'zod'

export const StateValue = z.enum([
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
])

export const Priority = z.enum(['low', 'med', 'high'])

export const TaskStatus = z.enum(['queued', 'running', 'paused', 'done', 'failed', 'cancelled'])

export const EventType = z.enum([
  'state',
  'task_start',
  'task_end',
  'message',
  'tool_call',
  'usage',
  'heartbeat',
  'command_ack',
  'layout_update'
])

export const BaseEventSchema = z.object({
  agent_id: z.string().min(1),
  ts: z.string().datetime().optional(),
  type: EventType,
  payload: z.unknown(),
  source: z.enum(['n8n', 'claude-code', 'sdk-ts', 'sdk-py', 'mcp', 'mock', 'api', 'seed']).optional()
})

export const StateEventSchema = BaseEventSchema.extend({
  type: z.literal('state'),
  payload: z.object({
    state: StateValue,
    reason: z.string().optional()
  })
})

export const TaskStartEventSchema = BaseEventSchema.extend({
  type: z.literal('task_start'),
  payload: z.object({
    task_id: z.string(),
    title: z.string(),
    priority: Priority.optional(),
    context: z.string().optional()
  })
})

export const TaskEndEventSchema = BaseEventSchema.extend({
  type: z.literal('task_end'),
  payload: z.object({
    task_id: z.string(),
    status: TaskStatus,
    result: z.string().optional(),
    duration_ms: z.number().optional()
  })
})

export const MessageEventSchema = BaseEventSchema.extend({
  type: z.literal('message'),
  payload: z.object({
    from: z.string(),
    to: z.string(),
    content: z.string(),
    thread_id: z.string().optional(),
    object: z.enum(['file', 'link', 'handoff', 'note']).optional()
  })
})

export const ToolCallEventSchema = BaseEventSchema.extend({
  type: z.literal('tool_call'),
  payload: z.object({
    name: z.string(),
    args_summary: z.string(),
    tool_id: z.string().optional(),
    ok: z.boolean().optional()
  })
})

export const UsageEventSchema = BaseEventSchema.extend({
  type: z.literal('usage'),
  payload: z.object({
    model: z.string(),
    tokens_in: z.number().int().nonnegative(),
    tokens_out: z.number().int().nonnegative(),
    cost: z.number().optional(),
    request_id: z.string().optional()
  })
})

export const HeartbeatEventSchema = BaseEventSchema.extend({
  type: z.literal('heartbeat'),
  payload: z.object({
    uptime_ms: z.number().optional()
  }).optional()
})

export const CommandAckEventSchema = BaseEventSchema.extend({
  type: z.literal('command_ack'),
  payload: z.object({
    command_id: z.string(),
    ok: z.boolean(),
    detail: z.string().optional()
  })
})

export const LayoutUpdateEventSchema = BaseEventSchema.extend({
  type: z.literal('layout_update'),
  payload: z.object({
    layout_json: z.any(),
    by: z.string().optional()
  })
})

export const EventSchema = z.discriminatedUnion('type', [
  StateEventSchema,
  TaskStartEventSchema,
  TaskEndEventSchema,
  MessageEventSchema,
  ToolCallEventSchema,
  UsageEventSchema,
  HeartbeatEventSchema,
  CommandAckEventSchema,
  LayoutUpdateEventSchema
])

export type EventInput = z.infer<typeof EventSchema>
export type StateValueType = z.infer<typeof StateValue>
