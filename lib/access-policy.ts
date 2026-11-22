import type { Role } from "./session"

/**
 * Central access policy for the admin UI and the JSON API (enforced by middleware.ts).
 *
 *  - GET on data endpoints stays public (the public map/dashboard needs it),
 *    except raw logs / analytics which need any logged-in user.
 *  - Every state-changing request needs a session with a sufficient role.
 *  - Device ingest endpoints (readings, events, detections, IoT log, alerts) also accept
 *    a machine key (`x-api-key` or `Authorization: Bearer`, env INGEST_API_KEY).
 */

export type Rule =
  | { kind: "public" }
  | { kind: "role"; role: Role }
  | { kind: "ingest" } // operator session OR ingest key

export const PUBLIC: Rule = { kind: "public" }
const role = (r: Role): Rule => ({ kind: "role", role: r })

const INGEST_PATTERNS: RegExp[] = [
  /^\/api\/devices\/[^/]+\/readings\/?$/,
  /^\/api\/devices\/[^/]+\/events\/?$/,
  /^\/api\/security\/detections\/?$/,
  /^\/api\/logging\/iot\/?$/,
  /^\/api\/analytics\/api-usage\/?$/,
  /^\/api\/alerts\/?$/,
]

// Read-only computations the public dashboard triggers with POST.
const PUBLIC_POST: RegExp[] = [/^\/api\/thresholds\/check\/?$/, /^\/api\/thresholds\/check-window\/?$/]

export function ruleFor(pathname: string, method: string): Rule {
  if (pathname.startsWith("/api/auth/")) return PUBLIC // login/logout/me; change-password verifies the session itself

  if (pathname.startsWith("/api/users") || pathname.startsWith("/api/admin")) return role("admin")

  const safe = method === "GET" || method === "HEAD" || method === "OPTIONS"
  if (safe) {
    if (pathname.startsWith("/api/logging/") || pathname.startsWith("/api/analytics/")) return role("viewer")
    return PUBLIC
  }

  if (PUBLIC_POST.some((re) => re.test(pathname))) return PUBLIC
  if (pathname.startsWith("/api/data-retention/")) return role("admin")
  if (method === "DELETE" && pathname.startsWith("/api/devices")) return role("admin")
  if (method === "POST" && INGEST_PATTERNS.some((re) => re.test(pathname))) return { kind: "ingest" }
  return role("operator")
}

/** Admin UI pages restricted to the admin role (the data behind them is also protected at API level). */
export function isAdminOnlyPage(pathname: string): boolean {
  return /^\/admin\/(users|audit-log)(\/|$)/.test(pathname)
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** True when the request carries the configured machine key (feature is off unless INGEST_API_KEY has >= 16 chars). */
export function hasValidIngestKey(headers: Pick<Headers, "get">, expected = process.env.INGEST_API_KEY): boolean {
  if (!expected || expected.length < 16) return false
  const auth = headers.get("authorization")
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null
  const provided = headers.get("x-api-key") ?? bearer
  return !!provided && timingSafeEqual(provided, expected)
}

