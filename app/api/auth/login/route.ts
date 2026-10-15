import { cookies } from "next/headers"
import { authenticate, createSessionToken, COOKIE_NAME } from "@/lib/auth"
import { SESSION_HOURS } from "@/lib/session"
import { getDb, isDbAvailable } from "@/lib/db"
import { clearFailures, recordFailure, retryAfterSeconds } from "@/lib/rate-limit"

// Failures allowed per 15 min window.
const MAX_FAILS_PER_IP_USER = 5 // one client hammering one account
const MAX_FAILS_PER_USER = 10 // all clients together; stops X-Forwarded-For spoofing

/** Client address as seen by the nearest proxy (last X-Forwarded-For hop). */
function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for")
  if (xff) {
    const hops = xff.split(",").map((s) => s.trim()).filter(Boolean)
    if (hops.length) return hops[hops.length - 1]
  }
  return request.headers.get("x-real-ip") || "unknown"
}

async function audit(userId: number | null, username: string, action: string, ip: string, ua: string) {
  if (!isDbAvailable()) return
  try {
    const sql = getDb()
    await sql`
      INSERT INTO auth_audit_log (user_id, username, action, ip_address, user_agent)
      VALUES (${userId}, ${username.slice(0, 100)}, ${action}, ${ip.slice(0, 64)}, ${ua})
    `
    if (action === "login_success" && userId != null) {
      await sql`UPDATE users SET last_login = NOW() WHERE id = ${userId}`
    }
  } catch (e) {
    console.error("auth audit log failed:", e)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    const username = typeof body?.username === "string" ? body.username.trim() : ""
    const password = typeof body?.password === "string" ? body.password : ""
    if (!username || !password || username.length > 100 || password.length > 256) {
      return Response.json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" }, { status: 400 })
    }

    const ip = clientIp(request)
    const ua = request.headers.get("user-agent") || ""
    const keyUser = `user:${username.toLowerCase()}`
    const keyIpUser = `ipuser:${ip}|${username.toLowerCase()}`

    const wait = Math.max(
      retryAfterSeconds(keyIpUser, MAX_FAILS_PER_IP_USER),
      retryAfterSeconds(keyUser, MAX_FAILS_PER_USER),
    )
    if (wait > 0) {
      await audit(null, username, "login_blocked", ip, ua)
      return Response.json(
        { error: `Đăng nhập sai quá nhiều lần. Thử lại sau ${Math.ceil(wait / 60)} phút.` },
        { status: 429, headers: { "Retry-After": String(wait) } },
      )
    }

    const user = await authenticate(username, password)

    if (!user) {
      recordFailure(keyIpUser)
      recordFailure(keyUser)
      await audit(null, username, "login_failed", ip, ua)
      return Response.json({ error: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 })
    }

    clearFailures(keyIpUser)
    clearFailures(keyUser)
    await audit(user.id, username, "login_success", ip, ua)

    const token = await createSessionToken(user)
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * SESSION_HOURS,
    })

    return Response.json({ user, must_change_password: !!user.must_change_password })
  } catch (error) {
    console.error("Login error:", error)
    return Response.json({ error: "Lỗi máy chủ" }, { status: 500 })
  }
}
