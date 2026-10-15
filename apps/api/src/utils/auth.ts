import bcrypt from 'bcryptjs'
import { db } from '../db/index.js'
import { agents } from '../db/schema/index.js'
import { eq } from 'drizzle-orm'

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10)
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash)
}

export function requireAuthEnabled(): boolean {
  return process.env.OFFICE_REQUIRE_AUTH === 'true'
}

/**
 * Verifies a bearer token against the stored hash of the given agent.
 * When OFFICE_REQUIRE_AUTH is not "true", auth is skipped (dev/demo mode).
 */
export async function verifyAgentToken(
  agentRowId: string,
  bearer: string | undefined
): Promise<boolean> {
  if (!requireAuthEnabled()) return true
  if (!bearer) return false
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : bearer
  const rows = await db.select().from(agents).where(eq(agents.id, agentRowId))
  if (rows.length === 0) return false
  return verifyToken(token, rows[0].tokenHash)
}
