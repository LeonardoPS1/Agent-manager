/**
 * Seed script: creates 5 demo agents (and their per-agent tokens).
 * Usage: npx tsx scripts/seed.ts
 */
import 'dotenv/config'

const API_URL = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:3000'

interface SeedAgent {
  slug: string
  name: string
  role: string
  model: string
  deskId: string
  systemPrompt: string
  appearance: Record<string, unknown>
}

const AGENTS: SeedAgent[] = [
  {
    slug: 'atlas',
    name: 'Atlas',
    role: 'Research Analyst',
    model: 'mistral',
    deskId: 'desk-1',
    systemPrompt: 'You are Atlas, a meticulous research analyst. Gather sources, summarize findings, and cite everything.',
    appearance: { character: 'office-male', skinColor: '#f1c8a0', hairColor: '#3b2a1a', outfitColor: '#3b82f6', accessory: 'glasses' }
  },
  {
    slug: 'nova',
    name: 'Nova',
    role: 'Content Writer',
    model: 'mistral',
    deskId: 'desk-2',
    systemPrompt: 'You are Nova, a creative content writer. Produce clear, compelling copy with a strong voice.',
    appearance: { character: 'office-female', skinColor: '#e8b98a', hairColor: '#7c3aed', outfitColor: '#ec4899', accessory: 'headphones' }
  },
  {
    slug: 'vector',
    name: 'Vector',
    role: 'Data Engineer',
    model: 'mistral',
    deskId: 'desk-3',
    systemPrompt: 'You are Vector, a data engineer. Design schemas, optimize queries, and keep pipelines reliable.',
    appearance: { character: 'office-male', scale: 1.05, skinColor: '#c98a5b', hairColor: '#111827', outfitColor: '#10b981', accessory: 'cap' }
  },
  {
    slug: 'orion',
    name: 'Orion',
    role: 'Ops / Infra',
    model: 'mistral',
    deskId: 'desk-4',
    systemPrompt: 'You are Orion, an infrastructure operator. Monitor services, handle incidents, automate toil.',
    appearance: { character: 'mannequin-medium', skinColor: '#f1c8a0', hairColor: '#b45309', outfitColor: '#f59e0b', accessory: 'watch' }
  },
  {
    slug: 'lyra',
    name: 'Lyra',
    role: 'Support Agent',
    model: 'mistral',
    deskId: 'desk-5',
    systemPrompt: 'You are Lyra, a friendly support agent. Resolve tickets with empathy and precision.',
    appearance: { character: 'office-female', scale: 0.97, skinColor: '#d9a06a', hairColor: '#0ea5e9', outfitColor: '#6366f1', accessory: 'headset' }
  }
]

async function upsertAgent(agent: SeedAgent) {
  const res = await fetch(`${API_URL}/v1/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(agent)
  })
  if (res.status === 409) {
    console.log(`  = ${agent.slug} already exists, skipping`)
    return null
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to create ${agent.slug}: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { agent: { id: string }; token: string }
  console.log(`  + ${agent.name} (${agent.slug}) -> id=${data.agent.id}`)
  console.log(`    token: ${data.token}`)
  return data
}

async function main() {
  console.log(`Seeding Aicore Office demo agents at ${API_URL}\n`)
  const tokens: Record<string, string> = {}
  for (const agent of AGENTS) {
    const created = await upsertAgent(agent)
    if (created) tokens[agent.slug] = created.token
  }

  if (Object.keys(tokens).length > 0) {
    console.log('\n--- Save these tokens (shown once) ---')
    for (const [slug, token] of Object.entries(tokens)) {
      console.log(`${slug}: ${token}`)
    }
  }
  console.log('\nSeed complete.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
