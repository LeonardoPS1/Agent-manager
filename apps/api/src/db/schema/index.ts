import { pgTable, uuid, varchar, text, boolean, timestamp, integer, numeric, bigserial, jsonb, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: varchar('slug', { length: 64 }).unique().notNull(),
  name: varchar('name', { length: 80 }).notNull(),
  role: varchar('role', { length: 80 }),
  model: varchar('model', { length: 120 }),
  systemPrompt: text('system_prompt'),
  deskId: varchar('desk_id', { length: 32 }),
  appearance: jsonb('appearance').notNull().default({}),
  webhookUrl: text('webhook_url'),
  webhookSecret: varchar('webhook_secret', { length: 64 }),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  slugIdx: index('agents_slug_idx').on(table.slug)
}))

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 160 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('queued'),
  priority: varchar('priority', { length: 8 }).notNull().default('med'),
  progress: integer('progress').default(0),
  context: text('context'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => ({
  agentStatusIdx: index('tasks_agent_status_idx').on(table.agentId, table.status)
}))

export const events = pgTable('events', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'set null' }),
  ts: timestamp('ts', { withTimezone: true }).notNull().defaultNow(),
  type: varchar('type', { length: 20 }).notNull(),
  payload: jsonb('payload').notNull(),
  source: varchar('source', { length: 16 }),
  meta: jsonb('meta').default({})
}, (table) => ({
  agentIdIdx: index('events_agent_id_idx').on(table.agentId),
  tsIdx: index('events_ts_idx').on(table.ts)
}))

export const messages = pgTable('messages', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  threadId: uuid('thread_id').defaultRandom(),
  fromAgent: uuid('from_agent').references(() => agents.id),
  toAgent: uuid('to_agent').references(() => agents.id),
  content: text('content').notNull(),
  object: jsonb('object'),
  ts: timestamp('ts', { withTimezone: true }).defaultNow()
}, (table) => ({
  threadTsIdx: index('messages_thread_ts_idx').on(table.threadId, table.ts)
}))

export const usage = pgTable('usage', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  agentId: uuid('agent_id').references(() => agents.id, { onDelete: 'cascade' }),
  ts: timestamp('ts', { withTimezone: true }).defaultNow(),
  model: varchar('model', { length: 120 }),
  tokensIn: integer('tokens_in').default(0),
  tokensOut: integer('tokens_out').default(0),
  cost: numeric('cost', { precision: 10, scale: 6 }),
  requestId: varchar('request_id', { length: 64 })
}, (table) => ({
  agentTsIdx: index('usage_agent_ts_idx').on(table.agentId, table.ts)
}))

export const layout = pgTable('layout', {
  id: integer('id').primaryKey().default(1),
  layoutJson: jsonb('layout_json').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  updatedBy: uuid('updated_by').references(() => agents.id)
})

export const agentsRelations = relations(agents, ({ many }) => ({
  tasks: many(tasks),
  events: many(events)
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  agent: one(agents, { fields: [tasks.agentId], references: [agents.id] })
}))

export const eventsRelations = relations(events, ({ one }) => ({
  agent: one(agents, { fields: [events.agentId], references: [agents.id] })
}))
