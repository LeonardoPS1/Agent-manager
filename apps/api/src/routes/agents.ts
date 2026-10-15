import { FastifyInstance } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { agents, tasks, usage, events } from '../db/schema/index.js'
import { hashToken } from '../utils/auth.js'
import { publishEvent } from '../services/bus.js'

const CreateAgentSchema = z.object({
  slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  role: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  systemPrompt: z.string().optional(),
  deskId: z.string().max(32).optional(),
  appearance: z.record(z.any()).optional(),
  webhookUrl: z.string().url().optional()
})

const UpdateAgentSchema = CreateAgentSchema.partial().omit({ slug: true })

const AssignTaskSchema = z.object({
  title: z.string().min(1).max(160),
  priority: z.enum(['low', 'med', 'high']).optional(),
  context: z.string().optional(),
  webhook_url: z.string().url().optional()
})

export default async function agentsRoutes(fastify: FastifyInstance) {
  // --- Create agent (returns token ONCE) ---
  fastify.post('/agents', async (request, reply) => {
    const parsed = CreateAgentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid agent', details: parsed.error.flatten() })
    }
    const data = parsed.data
    const token = `ofc_${crypto.randomUUID().replace(/-/g, '')}`
    const tokenHash = await hashToken(token)

    const [agent] = await db
      .insert(agents)
      .values({
        slug: data.slug,
        name: data.name,
        role: data.role,
        model: data.model,
        systemPrompt: data.systemPrompt,
        deskId: data.deskId,
        appearance: data.appearance ?? {},
        webhookUrl: data.webhookUrl,
        tokenHash
      })
      .returning()

    // Never return tokenHash
    const { tokenHash: _omit, ...safe } = agent
    return reply.code(201).send({ agent: safe, token })
  })

  // --- List agents (with live status) ---
  fastify.get('/agents', async () => {
    const rows = await db.select().from(agents).where(eq(agents.isActive, true))
    return rows.map(({ tokenHash: _omit, ...rest }) => rest)
  })

  // --- Get one ---
  fastify.get('/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const rows = await db.select().from(agents).where(eq(agents.id, id))
    if (rows.length === 0) return reply.code(404).send({ error: 'Not found' })
    const { tokenHash: _omit, ...safe } = rows[0]
    return safe
  })

  // --- Update ---
  fastify.patch('/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = UpdateAgentSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() })
    }
    const [updated] = await db
      .update(agents)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'Not found' })
    const { tokenHash: _omit, ...safe } = updated
    return safe
  })

  // --- Soft delete ---
  fastify.delete('/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const [updated] = await db
      .update(agents)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'Not found' })
    return { ok: true }
  })

  // --- Rotate token ---
  fastify.post('/agents/:id/token/rotate', async (request, reply) => {
    const { id } = request.params as { id: string }
    const token = `ofc_${crypto.randomUUID().replace(/-/g, '')}`
    const tokenHash = await hashToken(token)
    const [updated] = await db
      .update(agents)
      .set({ tokenHash, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning()
    if (!updated) return reply.code(404).send({ error: 'Not found' })
    return { ok: true, token }
  })

  // --- Assign a task (dispatches to webhook if configured) ---
  fastify.post('/agents/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsed = AssignTaskSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid task', details: parsed.error.flatten() })
    }
    const rows = await db.select().from(agents).where(eq(agents.id, id))
    if (rows.length === 0) return reply.code(404).send({ error: 'Agent not found' })
    const agent = rows[0]

    const [task] = await db
      .insert(tasks)
      .values({
        agentId: id,
        title: parsed.data.title,
        priority: parsed.data.priority ?? 'med',
        context: parsed.data.context,
        status: 'queued'
      })
      .returning()

    // Dispatch to the agent's webhook
    const target = parsed.data.webhook_url ?? agent.webhookUrl
    let dispatched = false
    if (target) {
      try {
        await fetch(target, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'assign_task', task_id: task.id, title: task.title })
        })
        dispatched = true
      } catch (err) {
        fastify.log.warn(`webhook dispatch failed: ${(err as Error).message}`)
      }
    }

    return reply.code(201).send({ ok: true, task, dispatched })
  })

  // --- Pause / Resume ---
  fastify.post('/agents/:id/pause', async (request, reply) => {
    const { id } = request.params as { id: string }
    await db.update(tasks).set({ status: 'paused' }).where(eq(tasks.agentId, id))
    return { ok: true }
  })

  fastify.post('/agents/:id/resume', async (request, reply) => {
    const { id } = request.params as { id: string }
    await db.update(tasks).set({ status: 'running' }).where(eq(tasks.agentId, id))
    return { ok: true }
  })
}
