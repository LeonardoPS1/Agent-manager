import { FastifyInstance } from 'fastify'
import { EventSchema } from '../schemas/events.js'
import { db } from '../db/index.js'
import { events, agents, messages, usage } from '../db/schema/index.js'
import { eq, and, gt, desc } from 'drizzle-orm'
import { publishEvent } from '../services/bus.js'
import { verifyAgentToken } from '../utils/auth.js'

/** Resolve an agent reference (uuid, slug or name) to its id. */
async function resolveAgentId(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null
  const isUuid = /^[0-9a-f-]{36}$/i.test(ref)
  const rows = await db
    .select({ id: agents.id })
    .from(agents)
    .where(isUuid ? eq(agents.id, ref) : eq(agents.slug, ref.toLowerCase()))
  return rows[0]?.id ?? null
}

export default async function eventsRoutes(fastify: FastifyInstance) {
  fastify.post('/events', async (request, reply) => {
    const parsed = EventSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid event', details: parsed.error.flatten() })
    }
    const ev = parsed.data

    // Resolve the agent by id (uuid) or slug
    const isUuid = /^[0-9a-f-]{36}$/i.test(ev.agent_id)
    const found = await db
      .select()
      .from(agents)
      .where(isUuid ? eq(agents.id, ev.agent_id) : eq(agents.slug, ev.agent_id))

    if (found.length === 0) {
      return reply.code(404).send({ error: 'Agent not found' })
    }
    const agent = found[0]
    if (!agent.isActive) {
      return reply.code(403).send({ error: 'Agent inactive' })
    }

    const authorized = await verifyAgentToken(agent.id, request.headers.authorization ?? undefined)
    if (!authorized) {
      return reply.code(401).send({ error: 'Invalid or missing bearer token' })
    }

    const [inserted] = await db
      .insert(events)
      .values({
        agentId: agent.id,
        type: ev.type,
        payload: ev.payload as object,
        source: ev.source ?? 'api',
        ts: ev.ts ? new Date(ev.ts) : new Date()
      })
      .returning()

    // Side-effects per event type
    if (ev.type === 'message') {
      const p = ev.payload as { from: string; to: string; content: string; thread_id?: string; object?: string }
      const [fromAgentId, toAgentId] = await Promise.all([
        resolveAgentId(p.from),
        resolveAgentId(p.to)
      ])
      await db.insert(messages).values({
        threadId: p.thread_id ?? undefined,
        fromAgent: fromAgentId,
        toAgent: toAgentId,
        content: p.content,
        object: p.object ? { kind: p.object } : null
      })
    } else if (ev.type === 'usage') {
      const p = ev.payload as { model: string; tokens_in: number; tokens_out: number; cost?: number }
      await db.insert(usage).values({
        agentId: agent.id,
        model: p.model,
        tokensIn: p.tokens_in,
        tokensOut: p.tokens_out,
        cost: p.cost != null ? String(p.cost) : null
      })
    }

    const wire = { ...inserted, agentId: agent.id }
    await publishEvent(wire)

    return reply.code(201).send({ ok: true, event_id: inserted.id, agent_id: agent.id })
  })

  fastify.get('/events', async (request) => {
    const { agent_id, type, since, limit } = request.query as {
      agent_id?: string
      type?: string
      since?: string
      limit?: string
    }

    const conditions = []
    if (agent_id) conditions.push(eq(events.agentId, agent_id))
    if (type) conditions.push(eq(events.type, type))
    if (since) conditions.push(gt(events.id, Number(since)))

    const where = conditions.length ? and(...conditions) : undefined

    const rows = await db
      .select()
      .from(events)
      .where(where)
      .orderBy(desc(events.id))
      .limit(Math.min(Number(limit ?? 100), 500))

    return rows
  })
}
