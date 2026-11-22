// Server-side (node runtime) session validation against the users table.
//
// middleware.ts only verifies the JWT signature/expiry — it must stay DB-free. This module is the
// authoritative second check, used by every privileged route via lib/authz.ts, so that:
//   - deleting / deactivating a user,
//   - changing a user's role,
//   - bumping users.token_version (password change/reset),
// take effect on the very next request instead of when the 8h token expires.
//
// Mock mode (no DATABASE_URL) has no users table: the JWT claims are trusted as before.
import type { Role, SessionPayload } from "./session"
import { getDb, isDbAvailable } from "./db"

export interface LiveUser {
  id: number
  username: string
  role: Role
  is_active: boolean
  /** null = the column does not exist yet (database not migrated with scripts/08) */
  token_version: number | null
}

export type SessionVerdict =
  | { ok: true; role: Role }
  | { ok: false; reason: "user_missing" | "inactive" | "token_revoked" | "invalid_role" }

const ROLES: readonly string[] = ["admin", "operator", "viewer"]

/** Pure decision: does this token still match the live user row? */
export function evaluateSession(session: Pick<SessionPayload, "tv">, live: LiveUser | null): SessionVerdict {
  if (!live) return { ok: false, reason: "user_missing" }
  if (!live.is_active) return { ok: false, reason: "inactive" }
  if (!ROLES.includes(live.role)) return { ok: false, reason: "invalid_role" }
  if (live.token_version !== null && (session.tv ?? 0) !== live.token_version) {
    return { ok: false, reason: "token_revoked" }
  }
  return { ok: true, role: live.role }
}

/** Postgres "undefined_column": the DB has not been migrated yet. */
export function isMissingColumn(e: unknown): boolean {
  return (e as { code?: string } | null)?.code === "42703"
}

// When the column is missing we remember it briefly instead of failing a query on every request,
// but re-probe soon so a migration is picked up without restarting the app.
const LEGACY_RECHECK_MS = 60_000
let legacyUntil = 0

export async function loadLiveUser(id: number): Promise<LiveUser | null> {
  const sql = getDb()
  if (Date.now() >= legacyUntil) {
    try {
      const rows = await sql`SELECT id, username, role, is_active, token_version FROM users WHERE id = ${id} LIMIT 1`
      return (rows[0] as LiveUser | undefined) ?? null
    } catch (e) {
      if (!isMissingColumn(e)) throw e
      legacyUntil = Date.now() + LEGACY_RECHECK_MS
      console.warn("[auth] users.token_version missing — run scripts/08-session-revocation-and-audit.sql")
    }
  }
  const rows = await sql`SELECT id, username, role, is_active FROM users WHERE id = ${id} LIMIT 1`
  return rows[0] ? ({ ...rows[0], token_version: null } as LiveUser) : null
}

/** Current token_version for a freshly authenticated user (0 when the column does not exist). */
export async function fetchTokenVersion(id: number): Promise<number> {
  return (await loadLiveUser(id))?.token_version ?? 0
}

/** Invalidate every session of this user. Returns the new version (0 when the DB is not migrated). */
export async function bumpTokenVersion(id: number): Promise<number> {
  const sql = getDb()
  try {
    const rows = await sql`UPDATE users SET token_version = token_version + 1 WHERE id = ${id} RETURNING token_version`
    return (rows[0]?.token_version as number | undefined) ?? 0
  } catch (e) {
    if (!isMissingColumn(e)) throw e
    console.warn("[auth] cannot revoke sessions: users.token_version missing (run scripts/08-…)")
    return 0
  }
}

export interface ResolvedSession {
  id: number
  username: string
  role: Role
}

/**
 * Validate a verified JWT payload against the database.
 * Returns the effective identity (role taken from the DB, not the token) or the failure reason.
 */
export async function resolveSession(
  session: SessionPayload,
): Promise<{ ok: true; user: ResolvedSession } | { ok: false; reason: string }> {
  const id = Number(session.sub)
  if (!isDbAvailable()) return { ok: true, user: { id, username: session.username, role: session.role } }
  if (!Number.isInteger(id)) return { ok: false, reason: "user_missing" }
  const live = await loadLiveUser(id)
  const verdict = evaluateSession(session, live)
  if (!verdict.ok) return verdict
  return { ok: true, user: { id, username: live!.username, role: verdict.role } }
}
