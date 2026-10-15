import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useStore } from '../../store/useStore'
import { STATE_COLORS } from '../../utils/animations'
import { api } from '../../utils/api'
import {
  CHARACTER_FAMILIES,
  CHARACTER_MODELS,
  CHARACTER_STATUS_LABELS,
  CHARACTER_STATUS_WARNING,
  DEFAULT_CHARACTER_ID,
  assetUrl,
  characterSwatch,
  getCharacterModel,
  randomCharacterModel,
  type CharacterFamilyId,
  type CharacterStatus
} from '../../utils/characters'

const TABS = ['Overview', 'Character', 'Tasks', 'Conversations', 'Tools/MCP', 'Memory', 'Logs', 'Costs'] as const
type Tab = (typeof TABS)[number]

const panelStyle: CSSProperties = {
  width: 360,
  flexShrink: 0,
  borderLeft: '1px solid rgba(255,255,255,0.08)',
  background: 'var(--panel, #141922)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}

const smallButtonStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'inherit',
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 12,
  cursor: 'pointer'
}

export function AgentPanel() {
  const selectedAgentId = useStore((s) => s.selectedAgentId)
  const agents = useStore((s) => s.agents)
  const agentState = useStore((s) => s.agentState)
  const currentTask = useStore((s) => s.currentTask)
  const events = useStore((s) => s.events)
  const messages = useStore((s) => s.messages)
  const [tab, setTab] = useState<Tab>('Overview')

  const agent = selectedAgentId ? agents[selectedAgentId] : undefined

  const agentEvents = useMemo(
    () => events.filter((e) => e.agentId === selectedAgentId).slice(-150).reverse(),
    [events, selectedAgentId]
  )

  const agentMessages = useMemo(
    () => messages.filter((e) => e.to === agent?.name || e.from === agent?.name).slice(-150).reverse(),
    [messages, agent]
  )

  const costs = useMemo(() => {
    const totals = { tokensIn: 0, tokensOut: 0, cost: 0, requests: 0 }
    for (const event of agentEvents) {
      if (event.type !== 'usage') continue
      totals.requests += 1
      totals.tokensIn += Number(event.payload?.tokens_in ?? 0)
      totals.tokensOut += Number(event.payload?.tokens_out ?? 0)
      totals.cost += Number(event.payload?.cost ?? 0)
    }
    return totals
  }, [agentEvents])

  if (!agent) {
    return (
      <aside style={panelStyle}>
        <div style={{ padding: 16, opacity: 0.6, fontSize: 13 }}>
          Select an agent in the office or the list to see its details.
        </div>
      </aside>
    )
  }

  const state = agentState[agent.id] ?? 'idle'

  return (
    <aside style={panelStyle}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: 99,
              background: STATE_COLORS[state],
              display: 'inline-block'
            }}
          />
          <div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{agent.name}</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {agent.role ?? 'Agent'} · {state}
            </div>
          </div>
        </div>
      </div>

      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 4,
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: tab === t ? 'rgba(96,165,250,0.2)' : 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'inherit',
              borderRadius: 8,
              padding: '4px 8px',
              fontSize: 12,
              cursor: 'pointer'
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, fontSize: 13 }}>
        {tab === 'Overview' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <Row label="Role" value={agent.role ?? '—'} />
            <Row label="Model" value={agent.model ?? '—'} />
            <Row label="Desk" value={agent.deskId ?? '—'} />
            <Row label="State" value={state} />
            {currentTask[agent.id] && (
              <div style={{ display: 'grid', gap: 4 }}>
                <div style={{ opacity: 0.6 }}>Current task</div>
                <div>{currentTask[agent.id]?.title}</div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 99 }}>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 99,
                      width: `${Math.round((currentTask[agent.id]?.progress ?? 0) * 100)}%`,
                      background: '#60a5fa'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'Character' && <CharacterTab key={agent.id} agentId={agent.id} />}

        {tab === 'Tasks' && (
          <EventList events={agentEvents.filter((e) => e.type.startsWith('task_'))} empty="No tasks yet" />
        )}

        {tab === 'Conversations' && (
          <div style={{ display: 'grid', gap: 8 }}>
            {agentMessages.length === 0 && <div style={{ opacity: 0.5 }}>No messages yet</div>}
            {agentMessages.map((m, i) => (
              <div
                key={i}
                style={{
                  background: m.from === agent.name ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.05)',
                  borderRadius: 8,
                  padding: '6px 10px'
                }}
              >
                <div style={{ fontSize: 11, opacity: 0.6 }}>
                  {m.from} → {m.to}
                </div>
                <div>{m.content}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'Tools/MCP' && (
          <EventList events={agentEvents.filter((e) => e.type === 'tool_call')} empty="No tool calls yet" />
        )}

        {tab === 'Memory' && (
          <div>
            <div style={{ opacity: 0.6, marginBottom: 6 }}>System prompt</div>
            <textarea
              defaultValue={agent.systemPrompt ?? ''}
              style={{
                width: '100%',
                minHeight: 160,
                background: '#0b0e14',
                color: 'inherit',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: 8,
                fontSize: 12,
                resize: 'vertical'
              }}
            />
          </div>
        )}

        {tab === 'Logs' && <EventList events={agentEvents} empty="No logs yet" />}

        {tab === 'Costs' && (
          <div style={{ display: 'grid', gap: 10 }}>
            <Row label="Requests" value={String(costs.requests)} />
            <Row label="Tokens in" value={costs.tokensIn.toLocaleString()} />
            <Row label="Tokens out" value={costs.tokensOut.toLocaleString()} />
            <Row label="Cost" value={`$${costs.cost.toFixed(4)}`} />
          </div>
        )}
      </div>
    </aside>
  )
}

/**
 * Character picker. Writes the chosen model id into `agent.appearance.character`
 * and persists it with a PATCH, so the selection survives a reload and is
 * visible to every other viewer of the same office.
 */
function CharacterTab({ agentId }: { agentId: string }) {
  const agent = useStore((s) => s.agents[agentId])
  const upsertAgent = useStore((s) => s.upsertAgent)
  const status = useStore((s) => s.characterStatus[agentId])

  const appearance = useMemo(
    () => ((agent?.appearance ?? {}) as Record<string, unknown>),
    [agent?.appearance]
  )

  const model = getCharacterModel(appearance.character)
  const [family, setFamily] = useState<CharacterFamilyId | 'all'>('all')
  const [scale, setScale] = useState(typeof appearance.scale === 'number' ? appearance.scale : 1)
  const [rotationDeg, setRotationDeg] = useState(
    typeof appearance.rotationY === 'number' ? Math.round((appearance.rotationY * 180) / Math.PI) : 45
  )
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!agent) return null

  const visible = family === 'all' ? CHARACTER_MODELS : CHARACTER_MODELS.filter((m) => m.family === family)

  async function commit(patch: Record<string, unknown>) {
    const next = { ...appearance, ...patch }
    upsertAgent({ ...agent, appearance: next })
    try {
      await api.updateAgent(agent.id, { appearance: next })
      setFeedback('Saved')
      setError(null)
    } catch (err) {
      setError((err as Error).message)
      setFeedback(null)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <Row label="Character" value={model.label} />
        <Row label="Family" value={model.family} />
        {model.rig && <Row label="Rig" value={model.rig} />}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ opacity: 0.6 }}>Animation</span>
          <StatusBadge status={status} />
        </div>
        {status && CHARACTER_STATUS_WARNING.includes(status) && (
          <div
            style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.4)',
              borderRadius: 8,
              padding: '6px 8px',
              fontSize: 11,
              lineHeight: 1.45
            }}
          >
            This model is not driven by animation clips. Pick another character, or
            keep it if the mesh-only look is what you want.
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        <Chip active={family === 'all'} onClick={() => setFamily('all')}>
          All
        </Chip>
        {CHARACTER_FAMILIES.map((entry) => (
          <Chip key={entry.id} active={family === entry.id} onClick={() => setFamily(entry.id)}>
            {entry.label}
          </Chip>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {visible.map((entry) => {
          const isActive = entry.id === model.id
          return (
            <button
              key={entry.id}
              onClick={() => commit({ character: entry.id })}
              title={entry.source}
              style={{
                background: isActive ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? 'rgba(96,165,250,0.7)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 8,
                padding: 4,
                cursor: 'pointer',
                color: 'inherit',
                textAlign: 'center'
              }}
            >
              <Thumb model={entry} />
              <div style={{ fontSize: 10, marginTop: 3, lineHeight: 1.2 }}>{entry.label}</div>
            </button>
          )
        })}
      </div>

      <div style={{ display: 'grid', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ opacity: 0.6, fontSize: 12 }}>Size {scale.toFixed(2)}x</span>
          <input
            type="range"
            min={0.5}
            max={1.6}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            onPointerUp={() => commit({ scale })}
            onKeyUp={() => commit({ scale })}
          />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span style={{ opacity: 0.6, fontSize: 12 }}>Rotation {rotationDeg}°</span>
          <input
            type="range"
            min={0}
            max={360}
            step={5}
            value={rotationDeg}
            onChange={(e) => setRotationDeg(Number(e.target.value))}
            onPointerUp={() => commit({ rotationY: (rotationDeg * Math.PI) / 180 })}
            onKeyUp={() => commit({ rotationY: (rotationDeg * Math.PI) / 180 })}
          />
        </label>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            onClick={() => {
              const picked = randomCharacterModel(family === 'all' ? undefined : family)
              commit({ character: picked.id })
            }}
            style={smallButtonStyle}
          >
            Randomise
          </button>
          <button
            onClick={() => {
              setScale(1)
              setRotationDeg(45)
              commit({ character: DEFAULT_CHARACTER_ID, scale: 1, rotationY: Math.PI / 4 })
            }}
            style={smallButtonStyle}
          >
            Reset
          </button>
          {feedback && <span style={{ fontSize: 11, opacity: 0.6 }}>{feedback}</span>}
          {error && <span style={{ fontSize: 11, color: '#f87171' }}>{error}</span>}
        </div>
      </div>
    </div>
  )
}

function Thumb({ model }: { model: { id: string; preview?: string; label: string } }) {
  const [failed, setFailed] = useState(false)
  const src = model.preview ? assetUrl(model.preview) : null

  if (!src || failed) {
    return (
      <div
        style={{
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 6,
          background: characterSwatch(model.id),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.85)'
        }}
      >
        {model.label.slice(0, 2)}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={model.label}
      onError={() => setFailed(true)}
      style={{
        width: '100%',
        aspectRatio: '1 / 1',
        objectFit: 'contain',
        borderRadius: 6,
        background: 'rgba(0,0,0,0.25)'
      }}
    />
  )
}

function StatusBadge({ status }: { status?: CharacterStatus }) {
  if (!status) return <span style={{ opacity: 0.5 }}>—</span>

  const warning = CHARACTER_STATUS_WARNING.includes(status)
  const color = warning ? '#f59e0b' : status === 'ok' ? '#22c55e' : '#94a3b8'

  return (
    <span
      style={{
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 99,
        border: `1px solid ${color}55`,
        background: `${color}1f`,
        color
      }}
    >
      {CHARACTER_STATUS_LABELS[status]}
    </span>
  )
}

function Chip({
  active,
  onClick,
  children
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(96,165,250,0.2)' : 'transparent',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'inherit',
        borderRadius: 99,
        padding: '2px 10px',
        fontSize: 11,
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ opacity: 0.6 }}>{label}</span>
      <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function EventList({ events, empty }: { events: { id: number; ts: string; type: string; payload: unknown }[]; empty: string }) {
  if (events.length === 0) return <div style={{ opacity: 0.5 }}>{empty}</div>

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {events.map((event) => (
        <div key={event.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '6px 8px' }}>
          <div style={{ fontSize: 11, opacity: 0.55 }}>
            {new Date(event.ts).toLocaleTimeString()} · {event.type}
          </div>
          <div style={{ fontSize: 12, wordBreak: 'break-word' }}>{JSON.stringify(event.payload)}</div>
        </div>
      ))}
    </div>
  )
}
