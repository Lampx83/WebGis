// Edge-safe session helpers (jose only — no bcrypt, no DB). Imported by both
// middleware.ts (edge) and lib/auth.ts (node), so keep it free of node-only deps.
import { SignJWT, jwtVerify } from "jose"

export type Role = "admin" | "operator" | "viewer"

export interface SessionPayload {
  sub: string // user id (string)
  username: string
  role: Role
  /** true while the account still uses the shipped default password */
  pwd_change?: boolean
  [key: string]: unknown
}

export const COOKIE_NAME = "webgis_session"
export const SESSION_HOURS = 8

const DEV_FALLBACK_SECRET = "dev-only-secret-never-use-in-production-0123456789"
const PLACEHOLDER_SECRETS = new Set([
  "change-me-please-set-a-long-random-secret",
  "dev-insecure-secret-change-me-in-production-please",
  DEV_FALLBACK_SECRET,
])

/**
 * Signing secret for session JWTs.
 *
 * In production a missing / placeholder / short AUTH_SECRET is a hard error:
 * falling back to a public string would let anyone mint an admin token.
 * In dev a fixed fallback keeps `npm run dev` zero-config.
 */
export function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET
  if (process.env.NODE_ENV === "production") {
    if (!secret || PLACEHOLDER_SECRETS.has(secret) || secret.length < 32) {
      throw new Error(
        "AUTH_SECRET must be set to a random string of at least 32 characters in production " +
          "(generate one with: openssl rand -base64 48)",
      )
    }
    return new TextEncoder().encode(secret)
  }
  return new TextEncoder().encode(secret || DEV_FALLBACK_SECRET)
}

export async function signSession(
  user: { id: number; username: string; role: Role },
  opts: { mustChangePassword?: boolean } = {},
): Promise<string> {
  const claims: Record<string, unknown> = { username: user.username, role: user.role }
  if (opts.mustChangePassword) claims.pwd_change = true
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getAuthSecret())
}

/** Returns the payload, or null when the token is missing/invalid/expired. Throws only on server misconfiguration. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  const secret = getAuthSecret() // may throw: misconfiguration must not look like "logged out"
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
    return payload as SessionPayload
  } catch {
    return null
  }
}

export function roleAtLeast(role: Role | undefined, required: Role): boolean {
  const rank: Record<Role, number> = { viewer: 1, operator: 2, admin: 3 }
  if (!role || !(role in rank)) return false
  return rank[role] >= rank[required]
}
