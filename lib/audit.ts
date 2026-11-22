// Admin audit log: who changed what. Writes are best-effort (a failed audit insert is logged but does
// not undo or fail the already-completed action) and only ever attribute actions to a logged-in user —
// requests authenticated with INGEST_API_KEY are machine traffic, not admin actions.
import type { Actor } from "./authz"
import { getDb, isDbAvailable } from "./db"
import { isMissingColumn } from "./session-check"

// ── Pure helpers ────────────────────────────────────────────────────────────

const SENSITIVE_KEY = /pass(word)?|hash|secret|token|api[_-]?key|cookie/i
const MAX_STRING = 500

export const DEVICE_FIELDS = ["device_id", "name", "type", "latitude", "longitude", "status", "battery_level"]
export const THRESHOLD_FIELDS = [
  "device_id",
  "parameter_type",
  "warning_threshold",
  "alert_threshold",
  "comparison_operator",
  "enabled",
  "description",
]
export const USER_FIELDS = ["username", "email", "full_name", "role", "is_active"]

type Rec = Record<string, unknown>

/** Copy only the named fields, drop anything that looks like a secret, truncate long strings. */
export function summarize(row: Rec | null | undefined, fields: readonly string[]): Rec {
  const out: Rec = {}
  if (!row) return out
  for (const key of fields) {
    if (!(key in row) || SENSITIVE_KEY.test(key)) continue
    const v = row[key]
    out[key] = typeof v === "string" && v.length > MAX_STRING ? v.slice(0, MAX_STRING) + "…" : v
  }
  return out
}

/** Only the fields whose value differs: `{ before: {...}, after: {...} }`, or null when nothing changed. */
export function diffRecords(
  before: Rec | null | undefined,
  after: Rec | null | undefined,
  fields: readonly string[],
): { before: Rec; after: Rec } | null {
  const b = summarize(before, fields)
  const a = summarize(after, fields)
  const changedB: Rec = {}
  const changedA: Rec = {}
  for (const key of fields) {
    if (JSON.stringify(b[key] ?? null) !== JSON.stringify(a[key] ?? null)) {
      if (key in b) changedB[key] = b[key]
      if (key in a) changedA[key] = a[key]
    }
  }
  return Object.keys(changedB).length || Object.keys(changedA).length ? { before: changedB, after: changedA } : null
}

export interface AuditEntry {
  action: string
  resource_type: string
  resource_id?: number | null
  changes?: unknown
}

/**
 * What to log for an admin editing a user: separate rows for the sensitive operations so they are
 * easy to filter. The password itself is never part of the record — only the fact it was reset.
 */
export function planUserUpdateAudit(
  id: number,
  before: Rec,
  after: Rec,
  passwordReset: boolean,
): AuditEntry[] {
  const entries: AuditEntry[] = []
  if (passwordReset) {
    entries.push({ action: "user.password_reset", resource_type: "user", resource_id: id, changes: { password: "reset" } })
  }
  const roleDiff = diffRecords(before, after, ["role"])
  if (roleDiff) entries.push({ action: "user.role_change", resource_type: "user", resource_id: id, changes: roleDiff })
  const otherFields = USER_FIELDS.filter((f) => f !== "role")
  const otherDiff = diffRecords(before, after, otherFields)
  if (otherDiff) entries.push({ action: "user.update", resource_type: "user", resource_id: id, changes: otherDiff })
  return entries
}

export function parsePaging(params: URLSearchParams, defaults = { pageSize: 25, maxPageSize: 100 }) {
  const int = (v: string | null, fb: number) => {
    const n = Number.parseInt(v ?? "", 10)
    return Number.isFinite(n) ? n : fb
  }
  const page = Math.max(1, int(params.get("page"), 1))
  const pageSize = Math.min(defaults.maxPageSize, Math.max(1, int(params.get("page_size"), defaults.pageSize)))
  return { page, pageSize, offset: (page - 1) * pageSize }
}

// ── DB access ───────────────────────────────────────────────────────────────

const LEGACY_RECHECK_MS = 60_000
let legacyUntil = 0 // admin_audit_log.actor_username missing (scripts/08 not applied)

/** Record an admin action. Never throws. */
export async function recordAudit(actor: Actor, entry: AuditEntry): Promise<void> {
  if (actor.kind !== "user" || !isDbAvailable()) return
  try {
    const sql = getDb()
    const changes = entry.changes === undefined ? null : sql.json(entry.changes as any)
    if (Date.now() >= legacyUntil) {
      try {
        await sql`
          INSERT INTO admin_audit_log (admin_id, actor_username, action, resource_type, resource_id, changes)
          VALUES (${actor.id}, ${actor.username}, ${entry.action}, ${entry.resource_type}, ${entry.resource_id ?? null}, ${changes})
        `
        return
      } catch (e) {
        if (!isMissingColumn(e)) throw e
        legacyUntil = Date.now() + LEGACY_RECHECK_MS
        console.warn("[audit] admin_audit_log.actor_username missing — run scripts/08-session-revocation-and-audit.sql")
      }
    }
    await sql`
      INSERT INTO admin_audit_log (admin_id, action, resource_type, resource_id, changes)
      VALUES (${actor.id}, ${entry.action}, ${entry.resource_type}, ${entry.resource_id ?? null}, ${changes})
    `
  } catch (e) {
    console.error("[audit] failed to record", entry.action, e)
  }
}

export async function recordAuditAll(actor: Actor, entries: AuditEntry[]): Promise<void> {
  for (const entry of entries) await recordAudit(actor, entry)
}

export interface AuditFilters {
  action?: string
  resourceType?: string
  actor?: string
}

export async function listAudit(opts: { limit: number; offset: number } & AuditFilters) {
  const sql = getDb()
  const run = async (actorExpr: ReturnType<typeof sql>) => {
    const conds = [sql`TRUE`]
    if (opts.action) conds.push(sql`l.action = ${opts.action}`)
    if (opts.resourceType) conds.push(sql`l.resource_type = ${opts.resourceType}`)
    if (opts.actor) conds.push(sql`${actorExpr} ILIKE ${"%" + opts.actor.replace(/[\\%_]/g, "\\$&") + "%"}`)
    const where = conds.reduce((acc, c) => sql`${acc} AND ${c}`)
    const [{ total }] = await sql`
      SELECT COUNT(*)::int AS total
      FROM admin_audit_log l LEFT JOIN users u ON u.id = l.admin_id
      WHERE ${where}
    `
    const items = await sql`
      SELECT l.id, l.admin_id, ${actorExpr} AS actor_username, l.action, l.resource_type,
             l.resource_id, l.changes, l.created_at
      FROM admin_audit_log l LEFT JOIN users u ON u.id = l.admin_id
      WHERE ${where}
      ORDER BY l.created_at DESC, l.id DESC
      LIMIT ${opts.limit} OFFSET ${opts.offset}
    `
    return { items, total: total as number }
  }

  if (Date.now() >= legacyUntil) {
    try {
      return await run(sql`COALESCE(l.actor_username, u.username)`)
    } catch (e) {
      if (!isMissingColumn(e)) throw e
      legacyUntil = Date.now() + LEGACY_RECHECK_MS
    }
  }
  return run(sql`u.username`)
}
