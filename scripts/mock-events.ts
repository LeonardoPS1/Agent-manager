/**
 * Mock event generator.
 *
 * Drives the whole pipeline with REAL HTTP events so every animation can be
 * exercised without a live agent. Fetches the seeded agents, then emits a
 * believable stream of events: states, tasks, handoffs, tool calls, usage.
 *
 * Usage:
 *   npx tsx scripts/mock-events.ts            # run forever
 *   npx tsx scripts/mock-events.ts --once     # a single burst
 *   MOCK_INTERVAL=1200 npx tsx scripts/mock-events.ts
 */
import 'dotenv/config'

const API_URL = process.env.API_URL || 'http://localhost:3000'
const INTERVAL = Number(process.env.MOCK_INTERVAL || 1500)
const ONCE = process.argv.includes('--once')

const STATES = [
  'thinking', 'typing', 'reading', 'sorting', 'printing',
  'saving', 'meeting', 'calling', 'error', 'done', 'idle'
] as const

const TASKS = [
  'Summarize Q3 research notes',
  'Draft launch announcement',
  'Optimize the events table indexes',
  'Investigate elevated API latency',
  'Triage support backlog',
  'Prepare weekly compliance report',
  'Refactor the ingestion pipeline',
  'Review pull request #482'
]

const TOOLS = ['web_search', 'postgres_query', 'http_request', 'file_write', 'gmail_send', 'slack_post']

interface Agent {
  id: string
  slug: string
  name: string
}

let agents: Agent[] = []

async function loadAgents(): Promise<void> {
  const res = await fetch(`${API_URL}/v1/agents`)
  if (!res.ok) throw new Error(`Failed to load agents: ${res.status}`)
  agents = (await res.json()) as Agent[]
  if (agents.length === 0) throw new Error('No agents found. Run: npx tsx scripts/seed.ts')
}

async function emit(agentId: string, type: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/v1/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agent_id: agentId, type, payload, ts: new Date().toISOString(), source: 'mock' })
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.warn(`  ! emit ${type} failed: ${res.status} ${text}`)
  }
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

async function burst() {
  if (agents.length === 0) await loadAgents()

  // Pick a primary actor
  const actor = pick(agents)
  const state = pick(STATES)
  console.log(`[${new Date().toLocaleTimeString()}] ${actor.name} -> ${state}`)

  await emit(actor.id, 'state', { state })

  if (state === 'typing' || state === 'thinking') {
    await emit(actor.id, 'usage', {
      model: 'mistral',
      tokens_in: 400 + Math.floor(Math.random() * 1200),
      tokens_out: 100 + Math.floor(Math.random() * 600),
      cost: Math.random() * 0.02
    })
  }

  if (state === 'error') {
    await emit(actor.id, 'tool_call', { name: pick(TOOLS), args_summary: 'timeout after 30s', ok: false })
  } else if (Math.random() < 0.4) {
    await emit(actor.id, 'tool_call', {
      name: pick(TOOLS),
      args_summary: 'query executed',
      ok: true
    })
  }

  // Task lifecycle
  if (Math.random() < 0.25) {
    const taskId = crypto.randomUUID()
    const title = pick(TASKS)
    await emit(actor.id, 'task_start', { task_id: taskId, title, priority: pick(['low', 'med', 'high']) })
    if (Math.random() < 0.5) {
      await emit(actor.id, 'task_end', { task_id: taskId, status: pick(['done', 'failed']) })
    }
  }

  // Handoff: a message between two agents
  if (Math.random() < 0.35 && agents.length > 1) {
    const target = pick(agents.filter((a) => a.id !== actor.id))
    await emit(target.id, 'message', {
      from: actor.name,
      to: target.name,
      content: pick([
        'Pásame el dataset cuando esté listo, por favor.',
        'Encontré un edge case en el parser — lo miro.',
        'El deploy quedó verde, seguimos.',
        'Necesito tu review en el PR #482.',
        'Los logs del servidor muestran picos cada 5 min.'
      ]),
      object: pick(['file', 'link', 'handoff', 'note'])
    })
  }

  // Meeting when several agents gather
  if (Math.random() < 0.1) {
    for (const a of agents.slice(0, 3)) {
      await emit(a.id, 'state', { state: 'meeting' })
    }
  }
}

async function main() {
  console.log(`Mock event generator -> ${API_URL} (interval ${INTERVAL}ms)`)
  await loadAgents()
  console.log(`Loaded ${agents.length} agents: ${agents.map((a) => a.name).join(', ')}\n`)

  if (ONCE) {
    await burst()
    return
  }

  // Run bursts on an interval
  for (;;) {
    try {
      await burst()
    } catch (err) {
      console.warn('  ! burst failed:', (err as Error).message)
    }
    await new Promise((r) => setTimeout(r, INTERVAL))
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
