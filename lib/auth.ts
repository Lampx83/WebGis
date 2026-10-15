import bcrypt from "bcryptjs"
import { getDb, isDbAvailable } from "./db"
import { signSession, type Role } from "./session"

export { COOKIE_NAME, verifySessionToken, roleAtLeast } from "./session"
export type { Role, SessionPayload } from "./session"

export interface AuthUser {
  id: number
  username: string
  email: string | null
  full_name: string | null
  role: Role
  is_active: boolean
  /** true while the account still has the seeded default password */
  must_change_password?: boolean
}

export const MIN_PASSWORD_LENGTH = 8

// Hash of the default password shipped in scripts/02-users-schema.sql.
// Any account still carrying this hash is forced to pick a new password.
const DEFAULT_PASSWORD_HASH = "$2b$10$qVUSfDNhBQ6/eEMqNNomeeg0k9dIphm4RyVFZzTkvnrGyqDlx0gGC"
const DEFAULT_PASSWORD_PLAIN = "Admin@123"

// Mock-mode (no DATABASE_URL) fallback admin. Only available outside
// production, or when DEMO_MODE=true is set explicitly.
function mockUsersEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "true"
}

const MOCK_USERS: (AuthUser & { password_hash: string })[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@webgis.local",
    full_name: "Quản trị hệ thống (mock)",
    role: "admin",
    is_active: true,
    password_hash: DEFAULT_PASSWORD_HASH,
  },
]

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

/** Returns an error message (Vietnamese) when the password is not acceptable, otherwise null. */
export function validateNewPassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
  }
  if (password.length > 128) return "Mật khẩu quá dài"
  if (password === DEFAULT_PASSWORD_PLAIN) return "Không được dùng lại mật khẩu mặc định"
  return null
}

/** Validate username + password. Returns the user on success, null otherwise. */
export async function authenticate(username: string, password: string): Promise<AuthUser | null> {
  let record: (AuthUser & { password_hash: string }) | null = null
  const usingDb = isDbAvailable()

  if (usingDb) {
    const sql = getDb()
    const rows = await sql`
      SELECT id, username, email, full_name, role, is_active, password_hash
      FROM users WHERE username = ${username} LIMIT 1
    `
    record = (rows[0] as any) ?? null
  } else if (mockUsersEnabled()) {
    record = MOCK_USERS.find((u) => u.username === username) ?? null
  }

  // Always burn one bcrypt compare so response time does not reveal whether the user exists.
  const ok = await verifyPassword(password, record?.password_hash ?? DEFAULT_PASSWORD_HASH)
  if (!record || !record.is_active || !ok) return null

  const { password_hash, ...user } = record
  // Without a DB the password cannot be changed, so don't trap mock mode in a forced-change loop.
  return { ...user, must_change_password: usingDb && password_hash === DEFAULT_PASSWORD_HASH } as AuthUser
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  return signSession(user, { mustChangePassword: user.must_change_password })
}
