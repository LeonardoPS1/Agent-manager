export interface ReplayRow {
  id: number
  agentId?: string | null
}

/**
 * Decide whether an event should be delivered to a subscriber.
 *
 * A global subscriber (no `agent_id`) receives every event; an agent-scoped
 * subscriber only receives events belonging to that agent.
 */
export function shouldDeliver(
  subscriptionAgentId: string | null | undefined,
  eventAgentId: string | null | undefined
): boolean {
  if (!subscriptionAgentId) return true
  return subscriptionAgentId === eventAgentId
}

/**
 * Normalize a `since` cursor (query param or stored cursor) into a numeric
 * lower bound. Anything non-numeric or non-positive becomes `0` (replay all).
 */
export function parseSince(raw: string | number | null | undefined): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/** Order replay rows by ascending id so the scene rebuilds in real order. */
export function sortReplayAsc<T extends ReplayRow>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.id - b.id)
}
