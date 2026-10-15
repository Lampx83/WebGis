import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { COOKIE_NAME, roleAtLeast, verifySessionToken, type Role, type SessionPayload } from "@/lib/session"

/**
 * Central access policy for the admin UI and the JSON API.
 *
 *  - GET on data endpoints stays public (the public map/dashboard needs it),
 *    except raw logs / analytics which need any logged-in user.
 *  - Every state-changing request needs a session with a sufficient role.
 *  - Device ingest endpoints (readings, detections, IoT log, alerts) also accept
 *    a machine key (`x-api-key` or `Authorization: Bearer`, env INGEST_API_KEY).
 */

type Rule =
  | { kind: "public" }
  | { kind: "role"; role: Role }
  | { kind: "ingest" } // operator session OR ingest key

const PUBLIC: Rule = { kind: "public" }
const role = (r: Role): Rule => ({ kind: "role", role: r })

const INGEST_PATTERNS: RegExp[] = [
  /^\/api\/devices\/[^/]+\/readings\/?$/,
  /^\/api\/security\/detections\/?$/,
  /^\/api\/logging\/iot\/?$/,
  /^\/api\/analytics\/api-usage\/?$/,
  /^\/api\/alerts\/?$/,
]

// Read-only computations the public dashboard triggers with POST.
const PUBLIC_POST: RegExp[] = [/^\/api\/thresholds\/check\/?$/, /^\/api\/thresholds\/check-window\/?$/]

function ruleFor(pathname: string, method: string): Rule {
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

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function hasValidIngestKey(req: NextRequest): boolean {
  const expected = process.env.INGEST_API_KEY
  if (!expected || expected.length < 16) return false // feature off unless a real key is configured
  const auth = req.headers.get("authorization")
  const bearer = auth?.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : null
  const provided = req.headers.get("x-api-key") ?? bearer
  return !!provided && timingSafeEqual(provided, expected)
}

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
    if (pathname.startsWith("/admin/users") && session.role !== "admin") return deny(req, 403, "Forbidden")
    if (session.pwd_change && !pathname.startsWith("/admin/change-password")) {
      return NextResponse.redirect(new URL("/admin/change-password", req.url))
    }
    return NextResponse.next()
  }

  // ── API ─────────────────────────────────────────────────────────────────
  const rule = ruleFor(pathname, req.method)
  if (rule.kind === "public") return NextResponse.next()

  if (rule.kind === "ingest" && hasValidIngestKey(req)) return NextResponse.next()

  const required: Role = rule.kind === "role" ? rule.role : "operator"
  if (!session) return deny(req, 401, "Unauthorized")
  if (session.pwd_change) return deny(req, 403, "Phải đổi mật khẩu mặc định trước khi tiếp tục", "PASSWORD_CHANGE_REQUIRED")
  if (!roleAtLeast(session.role, required)) return deny(req, 403, "Forbidden")
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
}
