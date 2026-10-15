import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Scene } from './components/3d/Scene'
import { AgentList } from './components/ui/AgentList'
import { AgentPanel } from './components/ui/AgentPanel'
import { ReplayBar } from './components/ui/ReplayBar'
import { useStore } from './store/useStore'
import { useWs } from './hooks/useWs'

export default function App() {
  const connected = useStore((s) => s.connected)
  const editMode = useStore((s) => s.editMode)
  const replayMode = useStore((s) => s.replayMode)
  const toggleEditMode = useStore((s) => s.toggleEditMode)
  const toggleReplayMode = useStore((s) => s.toggleReplayMode)
  const setAgents = useStore((s) => s.setAgents)

  const [banner, setBanner] = useState<string | null>(null)

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/v1/agents`,
        { headers: { 'x-viewer': 'web' } }
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as any[]
      setAgents(
        data.map((a) => ({
          id: a.id,
          slug: a.slug,
          name: a.name,
          role: a.role,
          model: a.model,
          deskId: a.deskId,
          appearance: a.appearance,
          webhookUrl: a.webhookUrl,
          isActive: a.isActive
        }))
      )
    } catch (err) {
      setBanner(`Could not load agents: ${(err as Error).message}`)
    }
  }, [setAgents])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  // Connect to the live event stream (broadcast mode: no agent filter)
  useWs({})

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex' }}>
      <AgentList />

      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <Scene />

        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            pointerEvents: 'none'
          }}
        >
          <div
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(12,16,24,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10,
              padding: '6px 12px'
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: connected ? '#22c55e' : '#ef4444',
                display: 'inline-block'
              }}
            />
            <strong style={{ fontSize: 14 }}>Aicore Office</strong>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            gap: 8
          }}
        >
          <TopButton active={editMode} onClick={toggleEditMode}>
            Layout Editor
          </TopButton>
          <TopButton active={replayMode} onClick={toggleReplayMode}>
            Replay
          </TopButton>
        </div>

        {banner && (
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              maxWidth: '70%',
              background: 'rgba(127,29,29,0.9)',
              border: '1px solid rgba(248,113,113,0.5)',
              borderRadius: 10,
              padding: '6px 10px',
              fontSize: 12,
              color: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>{banner}</span>
            <button
              title="Dismiss"
              onClick={() => setBanner(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        )}

        {editMode && (
          <div
            style={{
              position: 'absolute',
              bottom: 12,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(12,16,24,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13
            }}
          >
            Edit mode: drag furniture and save the layout.
          </div>
        )}

        {replayMode && <ReplayBar />}
      </div>

      <AgentPanel />
    </div>
  )
}

function TopButton({
  children,
  active,
  onClick
}: {
  children: ReactNode
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? 'rgba(96,165,250,0.25)' : 'rgba(12,16,24,0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        color: '#e6e9ef',
        borderRadius: 10,
        padding: '6px 12px',
        fontSize: 13,
        cursor: 'pointer'
      }}
    >
      {children}
    </button>
  )
}
