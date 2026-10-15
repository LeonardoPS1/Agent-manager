import { FastifyInstance } from 'fastify'
import type { WebSocket } from 'ws'
import { db } from '../db/index.js'
import { events } from '../db/schema/index.js'
import { gt, and, eq } from 'drizzle-orm'
import { getSubscriber, EVENT_CHANNEL } from '../services/bus.js'
import { shouldDeliver, parseSince } from '../services/replay.js'

interface Client {
  socket: WebSocket
  agentId: string | null
}

const clients = new Set<Client>()
let subscribed = false

function broadcast(payload: { agentId: string | null } & Record<string, unknown>) {
  const data = JSON.stringify(payload)
  for (const client of clients) {
    if (!shouldDeliver(client.agentId, payload.agentId)) continue
    if (client.socket.readyState === 1 /* OPEN */) {
      client.socket.send(data)
    }
  }
}

async function ensureSubscribed() {
  if (subscribed) return
  subscribed = true
  const sub = getSubscriber()
  await sub.subscribe(EVENT_CHANNEL)
  sub.on('message', (_channel, message) => {
    try {
      broadcast(JSON.parse(message))
    } catch {
      /* ignore */
    }
  })
}

function toSocket(connection: unknown): WebSocket {
  // @fastify/websocket has used both SocketStream and WebSocket shapes.
  const maybe = connection as { socket?: WebSocket }
  return (maybe.socket ?? (connection as WebSocket)) as WebSocket
}

export default async function streamRoutes(fastify: FastifyInstance) {
  fastify.get('/stream', { websocket: true }, (connection, req) => {
    const url = new URL(req.url, 'http://localhost')
    const agentId = url.searchParams.get('agent_id')
    const since = parseSince(url.searchParams.get('since'))
    const socket = toSocket(connection)

    void ensureSubscribed()

    const client: Client = { socket, agentId: agentId ?? null }
    clients.add(client)

    // Replay missed events
    if (since) {
      const conditions = [gt(events.id, Number(since) || 0)]
      if (agentId) conditions.push(eq(events.agentId, agentId))
      db.select()
        .from(events)
        .where(and(...conditions))
        .orderBy(events.id)
        .limit(500)
        .then((rows) => {
          for (const row of rows) {
            if (socket.readyState === 1) socket.send(JSON.stringify(row))
          }
        })
        .catch(() => {
          /* ignore */
        })
    }

    socket.on('close', () => clients.delete(client))
    socket.on('message', () => {
      if (socket.readyState === 1) socket.send(JSON.stringify({ type: 'pong', ts: new Date().toISOString() }))
    })
  })
}
