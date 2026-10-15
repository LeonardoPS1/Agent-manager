import { useEffect, useRef } from 'react'
import { WS_URL } from '../utils/api'
import { useStore, type OfficeEvent } from '../store/useStore'

interface UseWsOptions {
  agentId?: string
  token?: string
  enabled?: boolean
}

interface UseWsResult {
  send: (msg: unknown) => void
}

/**
 * Connects to the Aicore Office event stream (WS /v1/stream).
 * - Applies every incoming event to the store.
 * - On reconnect, replays missed events using `?since=<lastEventId>`.
 * - Exponential backoff capped at 10s.
 *
 * With no `agentId` the socket subscribes to the global (dashboard) feed.
 */
export function useWs({ agentId, token, enabled = true }: UseWsOptions): UseWsResult {
  const applyEvent = useStore((s) => s.applyEvent)
  const setConnected = useStore((s) => s.setConnected)
  const socketRef = useRef<WebSocket | null>(null)
  const lastIdRef = useRef<number>(0)
  const retryRef = useRef<number>(0)

  useEffect(() => {
    if (!enabled) return

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    const connect = () => {
      const params = new URLSearchParams()
      if (agentId) params.set('agent_id', agentId)
      if (token) params.set('token', token)
      if (lastIdRef.current > 0) params.set('since', String(lastIdRef.current))
      const url = `${WS_URL}/v1/stream?${params.toString()}`

      const ws = new WebSocket(url)
      socketRef.current = ws

      ws.onopen = () => {
        retryRef.current = 0
        setConnected(true)
      }

      ws.onmessage = (raw) => {
        try {
          const data = JSON.parse(raw.data as string) as OfficeEvent
          if (typeof data.id === 'number') lastIdRef.current = data.id
          applyEvent(data)
        } catch {
          // ignore malformed frames (e.g. heartbeat pings)
        }
      }

      ws.onclose = () => {
        setConnected(false)
        const delay = Math.min(1000 * 2 ** retryRef.current, 10000)
        retryRef.current += 1
        reconnectTimer = setTimeout(connect, delay)
      }

      ws.onerror = () => ws.close()
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socketRef.current?.close()
    }
  }, [agentId, token, enabled, applyEvent, setConnected])

  return {
    send: (msg: unknown) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(msg))
      }
    }
  }
}
