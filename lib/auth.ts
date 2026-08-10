import bcrypt from "bcryptjs"
import { SignJWT, jwtVerify } from "jose"
import { getDb, isDbAvailable } from "./db"

export type Role = "admin" | "operator" | "viewer"

export interface AuthUser {
  id: number
  username: string
  email: string | null
  full_name: string | null
  role: Role
  is_active: boolean
}

export interface SessionPayload {
  sub: string // user id (string)
  username: string
  role: Role
  [key: string]: unknown
}

export const COOKIE_NAME = "webgis_session"
const SESSION_HOURS = 8

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "dev-insecure-secret-change-me-in-production-please"
  return new TextEncoder().encode(secret)
}

// Fallback admin for mock mode (no DATABASE_URL). Default password: Admin@123
const MOCK_ADMIN_HASH = "$2b$10$qVUSfDNhBQ6/eEMqNNomeeg0k9dIphm4RyVFZzTkvnrGyqDlx0gGC"
const MOCK_USERS: (AuthUser & { password_hash: string })[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@webgis.local",
    full_name: "Quản trị hệ thống (mock)",
    role: "admin",
    is_active: true,
    password_hash: MOCK_ADMIN_HASH,
  },
]

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** Validate username + password. Returns the user on success, null otherwise. */
export async function authenticate(username: string, password: string): Promise<AuthUser | null> {
  let record: (AuthUser & { password_hash: string }) | null = null

  if (isDbAvailable()) {
    const sql = getDb()
    const rows = await sql`
      SELECT id, username, email, full_name, role, is_active, password_hash
      FROM users WHERE username = ${username} LIMIT 1
    `
    record = (rows[0] as any) ?? null
  } else {
    record = MOCK_USERS.find((u) => u.username === username) ?? null
  }

  if (!record || !record.is_active) return null
  const ok = await verifyPassword(password, record.password_hash)
  if (!ok) return null

  const { password_hash, ...user } = record
  return user as AuthUser
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return new SignJWT({ username: user.username, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(user.id))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(getSecret())
}

/** Verify a session token. Edge-safe (uses jose only). Returns payload or null. */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return payload as SessionPayload
  } catch {
    return null
  }
}

export function roleAtLeast(role: Role | undefined, required: Role): boolean {
  const rank: Record<Role, number> = { viewer: 1, operator: 2, admin: 3 }
  if (!role) return false
  return rank[role] >= rank[required]
}
