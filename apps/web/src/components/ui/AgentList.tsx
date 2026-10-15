import { useState, type CSSProperties } from 'react'
import { useStore } from '../../store/useStore'
import { STATE_COLORS } from '../../utils/animations'
import { api } from '../../utils/api'
import { CHARACTER_STATUS_WARNING } from '../../utils/characters'

const asideStyle: CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderRight: '1px solid rgba(255,255,255,0.08)',
  background: 'var(--panel, #141922)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}

const headerStyle: CSSProperties = {
  padding: '12px 14px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8
}

const smallButtonStyle: CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: 'inherit',
  borderRadius: 8,
  padding: '3px 8px',
  fontSize: 12,
  cursor: 'pointer'
}

const inputStyle: CSSProperties = {
  width: '100%',
  background: '#0b0e14',
  color: 'inherit',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '6px 8px',
  fontSize: 12
}

/** Slugs must satisfy `^[a-z0-9-]{3,64}$` on the API side. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
}

/** First free `desk-N` so a new agent never lands on an occupied desk. */
function nextDeskId(agents: Record<string, { deskId?: string }>): string | undefined {
  const used = new Set(
    Object.values(agents)
      .map((agent) => agent.deskId)
      .filter(Boolean) as string[]
  )
  for (let i = 1; i <= 10; i++) {
    const candidate = `desk-${i}`
    if (!used.has(candidate)) return candidate
  }
  return undefined
}

/**
 * Agent roster with create/delete controls.
 *
 * Creating an agent returns a one-time token from `POST /v1/agents`; it is shown
 * once here because the server only stores its hash.
 */
export function AgentList() {
  const agents = useStore((s) => s.agents)
  const agentState = useStore((s) => s.agentState)
  const characterStatus = useStore((s) => s.characterStatus)
  const selectedAgentId = useStore((s) => s.selectedAgentId)
  const selectAgent = useStore((s) => s.selectAgent)
  const upsertAgent = useStore((s) => s.upsertAgent)
  const removeAgent = useStore((s) => s.removeAgent)

  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [issuedToken, setIssuedToken] = useState<{ name: string; token: string } | null>(null)

  const list = Object.values(agents)

  async function submit() {
    const label = name.trim()
    if (label.length < 1) {
      setError('Name is required.')
      return
    }

    setBusy(true)
    setError(null)

    const base = slugify(label) || `agent-${Date.now().toString(36)}`
    const candidates =
      base.length >= 3
        ? [base, `${base}-${Math.floor(Math.random() * 900 + 100)}`, `${base}-${Date.now().toString(36)}`]
        : [`${base}-${Date.now().toString(36)}`, `agent-${Date.now().toString(36)}`]

    let lastError = ''
    for (const slug of candidates) {
      try {
        const created = await api.createAgent({
          slug,
          name: label,
          role: role.trim() || undefined,
          model: 'mistral',
          deskId: nextDeskId(agents)
        })
        upsertAgent(created.agent)
        selectAgent(created.agent.id)
        setIssuedToken({ name: created.agent.name, token: created.token })
        setName('')
        setRole('')
        setFormOpen(false)
        setBusy(false)
        return
      } catch (err) {
        lastError = (err as Error).message
      }
    }

    setError(lastError || 'Could not create the agent.')
    setBusy(false)
  }

  async function remove(id: string, label: string) {
    if (!window.confirm(`Delete ${label}? The agent is deactivated and removed from the office.`)) return

    try {
      await api.deleteAgent(id)
      removeAgent(id)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <aside style={asideStyle}>
      <div style={headerStyle}>
        <div style={{ fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.6 }}>
          Agents
        </div>
        <button
          style={smallButtonStyle}
          onClick={() => {
            setFormOpen((open) => !open)
            setError(null)
          }}
        >
          {formOpen ? 'Cancel' : '+ New'}
        </button>
      </div>

      {formOpen && (
        <div
          style={{
            padding: 10,
            display: 'grid',
            gap: 6,
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          <input
            style={inputStyle}
            placeholder="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
          />
          <input
            style={inputStyle}
            placeholder="Role (optional)"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void submit()
            }}
          />
          <button style={smallButtonStyle} disabled={busy} onClick={() => void submit()}>
            {busy ? 'Creating…' : 'Create agent'}
          </button>
        </div>
      )}

      {issuedToken && (
        <div
          style={{
            margin: 10,
            padding: 8,
            borderRadius: 8,
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.4)',
            fontSize: 11,
            display: 'grid',
            gap: 4
          }}
        >
          <div>
            Token for <strong>{issuedToken.name}</strong> — shown once, store it now.
          </div>
          <code style={{ wordBreak: 'break-all', fontSize: 11 }}>{issuedToken.token}</code>
          <button style={smallButtonStyle} onClick={() => setIssuedToken(null)}>
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div style={{ margin: 10, fontSize: 11, color: '#f87171', wordBreak: 'break-word' }}>{error}</div>
      )}

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {list.length === 0 && (
          <div style={{ padding: 14, fontSize: 13, opacity: 0.5 }}>
            No agents yet. Use “+ New” to add one.
          </div>
        )}

        {list.map((agent) => {
          const state = agentState[agent.id] ?? 'idle'
          const active = selectedAgentId === agent.id
          const charStatus = characterStatus[agent.id]
          const charWarning = charStatus ? CHARACTER_STATUS_WARNING.includes(charStatus) : false

          return (
            <div
              key={agent.id}
              style={{ display: 'flex', alignItems: 'stretch', gap: 4, padding: '4px 8px 4px 10px' }}
            >
              <button
                onClick={() => selectAgent(agent.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  textAlign: 'left',
                  background: active ? 'rgba(96,165,250,0.14)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 99,
                    background: STATE_COLORS[state],
                    flexShrink: 0
                  }}
                />
                <span style={{ display: 'grid', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {agent.name}
                    {charWarning && (
                      <span title={`Character: ${charStatus}`} style={{ color: '#f59e0b' }}>
                        !
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.55, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {agent.role ?? state}
                  </span>
                </span>
              </button>

              <button
                title={`Delete ${agent.name}`}
                onClick={() => void remove(agent.id, agent.name)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  color: 'inherit',
                  opacity: 0.5,
                  cursor: 'pointer',
                  padding: '0 8px'
                }}
              >
                ×
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
