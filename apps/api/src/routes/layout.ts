import { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { layout } from '../db/schema/index.js'

const SaveLayoutSchema = z.object({
  layout: z.any()
})

export default async function layoutRoutes(fastify: FastifyInstance) {
  fastify.get('/layout', async (_request, reply) => {
    const rows = await db.select().from(layout).where(eq(layout.id, 1))
    if (rows.length === 0) {
      return reply.code(404).send({ error: 'No layout saved yet' })
    }
    return { layout: rows[0].layoutJson, updated_at: rows[0].updatedAt }
  })

  fastify.post('/layout', async (request, reply) => {
    const parsed = SaveLayoutSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() })
    }

    const existing = await db.select().from(layout).where(eq(layout.id, 1))
    if (existing.length === 0) {
      await db.insert(layout).values({ id: 1, layoutJson: parsed.data.layout })
    } else {
      await db
        .update(layout)
        .set({ layoutJson: parsed.data.layout, updatedAt: new Date() })
        .where(eq(layout.id, 1))
    }
    return { ok: true }
  })
}
