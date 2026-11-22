// Route-level authorization (node runtime). middleware.ts is only the coarse, DB-free first gate;
// every privileged route handler calls authorize() so revocation (deleted / deactivated user,
// role change, token_version bump) is enforced against the database on each request.
//
// The required role comes from lib/access-policy.ts, the same table middleware uses, so the two
// layers cannot drift. lib/route-guard.test.ts asserts every non-public handler calls authorize().
import { COOKIE_NAME, roleAtLeast, verifySessionToken, type Role } from "./session"
import { hasValidIngestKey, ruleFor } from "./access-policy"
import { resolveSession } from "./session-check"

export type Actor =
  | { kind: "user"; id: number; username: string; role: Role }
  | { kind: "ingest_key" } // machine key: not an admin action, never written to admin_audit_log
  | { kind: "anonymous" } // public route

export type AuthResult = { ok: true; actor: Actor } | { ok: false; response: Response }

export function readCookie(header: string | null | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(";")) {
    const i = part.indexOf("=")
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim()
  }
  return undefined
}

function clearCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : ""
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`
}

function fail(status: 401 | 403 | 503, error: string, code?: string, clearCookie = false): AuthResult {
  const headers = new Headers()
  if (clearCookie) headers.append("Set-Cookie", clearCookieHeader())
  return {
    ok: false,
    response: Response.json({ error, ...(code ? { code } : {}) }, { status, headers }),
  }
}

export async function authorize(request: Request): Promise<AuthResult> {
  const { pathname } = new URL(request.url)
  const rule = ruleFor(pathname, request.method)
  if (rule.kind === "public") return { ok: true, actor: { kind: "anonymous" } }
  if (rule.kind === "ingest" && hasValidIngestKey(request.headers)) return { ok: true, actor: { kind: "ingest_key" } }
  const required: Role = rule.kind === "role" ? rule.role : "operator"

  let session
  try {
    session = await verifySessionToken(readCookie(request.headers.get("cookie"), COOKIE_NAME))
  } catch (e) {
    console.error("[auth] misconfiguration:", (e as Error).message)
    return fail(503, "Server auth misconfigured")
  }
  if (!session) return fail(401, "Unauthorized")
  if (session.pwd_change) {
    return fail(403, "Phải đổi mật khẩu mặc định trước khi tiếp tục", "PASSWORD_CHANGE_REQUIRED")
  }

  let resolved
  try {
    resolved = await resolveSession(session)
  } catch (e) {
    // Cannot confirm the account is still valid: fail closed rather than trust a possibly revoked token.
    console.error("[auth] session lookup failed:", e)
    return fail(503, "Không xác thực được phiên đăng nhập (cơ sở dữ liệu không khả dụng)")
  }
  if (!resolved.ok) return fail(401, "Phiên đăng nhập không còn hiệu lực", "SESSION_REVOKED", true)

  if (!roleAtLeast(resolved.user.role, required)) return fail(403, "Forbidden")
  return { ok: true, actor: { kind: "user", ...resolved.user } }
}
