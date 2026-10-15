import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import eventsRoutes from './routes/events.js'
import agentsRoutes from './routes/agents.js'
import streamRoutes from './routes/stream.js'
import layoutRoutes from './routes/layout.js'

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
  }
})

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true
})

await fastify.register(websocket)

await fastify.register(eventsRoutes, { prefix: '/v1' })
await fastify.register(agentsRoutes, { prefix: '/v1' })
await fastify.register(streamRoutes, { prefix: '/v1' })
await fastify.register(layoutRoutes, { prefix: '/v1' })

fastify.get('/health', async () => ({ ok: true, ts: new Date().toISOString() }))

const port = Number(process.env.PORT || 3000)

fastify
  .listen({ port, host: '0.0.0.0' })
  .then(() => fastify.log.info(`Aicore Office API listening on :${port}`))
  .catch((err) => {
    fastify.log.error(err)
    process.exit(1)
  })
