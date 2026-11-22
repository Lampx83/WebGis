import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { COOKIE_NAME, roleAtLeast, verifySessionToken, type Role, type SessionPayload } from "@/lib/session"
import { hasValidIngestKey, isAdminOnlyPage, ruleFor } from "@/lib/access-policy"

/**
 * Enforcement point for lib/access-policy.ts — the coarse, DB-free first gate (JWT signature, expiry, role
 * claim). It cannot see revocation: a deleted / deactivated / role-changed / password-reset account keeps a
 * valid JWT until it expires. Privileged API handlers therefore also call authorize() (lib/authz.ts), which
 * re-checks the user row, so revocation is effective on the next request. Public GETs stay DB-free.
 */
function deny(req: NextRequest, status: 401 | 403, error: string, code?: string) {
  const { pathname } = req.nextUrl
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error, ...(code ? { code } : {}) }, { status })
  }
  if (status === 401) {
    const url = new URL("/login", req.url)
    url.searchParams.set("from", pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.redirect(new URL("/admin", req.url))
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith("/api/")

  let session: SessionPayload | null = null
  try {
    session = await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value)
  } catch (e) {
    // AUTH_SECRET missing in production: fail closed instead of trusting anything.
    console.error("[auth] misconfiguration:", (e as Error).message)
    return isApi
      ? NextResponse.json({ error: "Server auth misconfigured" }, { status: 503 })
      : new NextResponse("Server auth misconfigured", { status: 503 })
  }

  // ── Admin UI ────────────────────────────────────────────────────────────
  if (!isApi) {
    if (!session) return deny(req, 401, "Unauthorized")
    if (isAdminOnlyPage(pathname) && session.role !== "admin") return deny(req, 403, "Forbidden")
    if (session.pwd_change && !pathname.startsWith("/admin/change-password")) {
      return NextResponse.redirect(new URL("/admin/change-password", req.url))
    }
    return NextResponse.next()
  }

  // ── API ─────────────────────────────────────────────────────────────────
  const rule = ruleFor(pathname, req.method)
  if (rule.kind === "public") return NextResponse.next()

  if (rule.kind === "ingest" && hasValidIngestKey(req.headers)) return NextResponse.next()

  const required: Role = rule.kind === "role" ? rule.role : "operator"
  if (!session) return deny(req, 401, "Unauthorized")
  if (session.pwd_change) return deny(req, 403, "Phải đổi mật khẩu mặc định trước khi tiếp tục", "PASSWORD_CHANGE_REQUIRED")
  if (!roleAtLeast(session.role, required)) return deny(req, 403, "Forbidden")
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
}
