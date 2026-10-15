import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'
import { STATE_COLORS } from '../3d/Character'

/**
 * Replay mode: a timeline scrubber over stored events.
 * Scrubbing re-applies events; Play advances automatically.
 */
export function ReplayBar() {
  const events = useStore((s) => s.events)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)

  const max = events.length
  const safeIndex = Math.min(index, max)
  const current = events[safeIndex - 1]

  // When new events arrive while not playing, follow the head of the stream.
  useEffect(() => {
    if (!playing) setIndex(events.length)
  }, [events.length, playing])

  useEffect(() => {
    if (!playing) return
    if (index >= max) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setIndex((i) => i + 1), 600)
    return () => clearTimeout(t)
  }, [playing, index, max])

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(720px, 90%)',
        background: 'rgba(12,16,24,0.92)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 12,
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}
    >
      <button
        onClick={() => setPlaying((p) => !p)}
        style={{
          background: playing ? 'rgba(239,68,68,0.25)' : 'rgba(96,165,250,0.25)',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#e6e9ef',
          borderRadius: 8,
          padding: '4px 12px',
          fontSize: 12,
          cursor: 'pointer'
        }}
      >
        {playing ? 'Pause' : 'Play'}
      </button>

      <input
        type="range"
        min={0}
        max={max}
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
        style={{ flex: 1 }}
      />

      <span style={{ fontSize: 12, opacity: 0.7, minWidth: 70, textAlign: 'right' }}>
        {index}/{max}
      </span>

      {current && (
        <span style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 99,
              background:
                STATE_COLORS[(current.payload?.state as keyof typeof STATE_COLORS) ?? 'idle'] ?? '#94a3b8'
            }}
          />
          {current.type}
        </span>
      )}
    </div>
  )
}
