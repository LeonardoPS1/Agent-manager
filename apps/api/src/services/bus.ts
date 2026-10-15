import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
export const EVENT_CHANNEL = 'office:events'

let publisher: Redis | null = null
let subscriber: Redis | null = null

function getPublisher(): Redis {
  if (!publisher) {
    publisher = new Redis(REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: null })
    publisher.on('error', (err) => console.error('[bus:publisher]', err.message))
  }
  return publisher
}

export function getSubscriber(): Redis {
  if (!subscriber) {
    subscriber = new Redis(REDIS_URL, { lazyConnect: false, maxRetriesPerRequest: null })
    subscriber.on('error', (err) => console.error('[bus:subscriber]', err.message))
  }
  return subscriber
}

export async function publishEvent(payload: unknown): Promise<void> {
  try {
    await getPublisher().publish(EVENT_CHANNEL, JSON.stringify(payload))
  } catch (err) {
    console.error('[bus] publish failed', (err as Error).message)
  }
}
