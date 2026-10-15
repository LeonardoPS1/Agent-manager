import { Html } from '@react-three/drei'
import { STATE_COLORS, STATE_LABELS } from '../../utils/animations'
import type { AgentState } from '../../store/useStore'

/**
 * Floating name tag + status pill rendered above every character, plus the
 * speech bubble used when the agent is talking to someone.
 */
export function AgentTag({
  name,
  state,
  speech,
  y = 2.1
}: {
  name: string
  state: AgentState
  speech?: string
  y?: number
}) {
  const statusColor = STATE_COLORS[state] ?? '#94a3b8'

  return (
    <>
      <Html position={[0, y, 0]} center distanceFactor={14}>
        <div
          style={{
            background: 'rgba(12,16,24,0.85)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            padding: '4px 8px',
            color: '#e6e9ef',
            fontSize: 12,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none'
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background: statusColor,
              display: 'inline-block'
            }}
          />
          <strong>{name}</strong>
          <span style={{ opacity: 0.6 }}>{STATE_LABELS[state] ?? state}</span>
        </div>
      </Html>

      {speech && (
        <Html position={[0, y + 0.5, 0]} center distanceFactor={14}>
          <div
            style={{
              background: '#f8fafc',
              color: '#0b0e14',
              borderRadius: 10,
              padding: '6px 10px',
              fontSize: 12,
              maxWidth: 220,
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)'
            }}
          >
            {speech}
          </div>
        </Html>
      )}
    </>
  )
}

/** Ring drawn on the floor under the selected agent. */
export function SelectionRing() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <ringGeometry args={[0.4, 0.5, 32]} />
      <meshBasicMaterial color="#60a5fa" transparent opacity={0.8} />
    </mesh>
  )
}

export { STATE_LABELS }
