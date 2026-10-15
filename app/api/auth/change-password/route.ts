import { cookies } from "next/headers"
import {
  authenticate,
  createSessionToken,
  hashPassword,
  validateNewPassword,
  COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth"
import { SESSION_HOURS } from "@/lib/session"
import { getDb, isDbAvailable } from "@/lib/db"
import { clearFailures, recordFailure, retryAfterSeconds } from "@/lib/rate-limit"

// Self-service password change. Not covered by the middleware role rules
// (everything under /api/auth/ is public), so the session is verified here.
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const session = await verifySessionToken(cookieStore.get(COOKIE_NAME)?.value)
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

    if (!isDbAvailable()) {
      return Response.json({ error: "Không thể đổi mật khẩu khi chưa cấu hình cơ sở dữ liệu" }, { status: 503 })
    }

    const body = await request.json().catch(() => null)
    const current = typeof body?.current_password === "string" ? body.current_password : ""
    const next = body?.new_password
    if (!current) return Response.json({ error: "Thiếu mật khẩu hiện tại" }, { status: 400 })

    const problem = validateNewPassword(next)
    if (problem) return Response.json({ error: problem }, { status: 400 })
    if (next === current) {
      return Response.json({ error: "Mật khẩu mới phải khác mật khẩu hiện tại" }, { status: 400 })
    }

    // Reuse the login limiter: this endpoint is also a password oracle for a stolen session.
    const key = `chpw:${session.sub}`
    const wait = retryAfterSeconds(key, 5)
    if (wait > 0) {
      return Response.json(
        { error: "Thử sai quá nhiều lần, vui lòng thử lại sau." },
        { status: 429, headers: { "Retry-After": String(wait) } },
      )
    }

    const user = await authenticate(session.username, current)
    if (!user || String(user.id) !== session.sub) {
      recordFailure(key)
      return Response.json({ error: "Mật khẩu hiện tại không đúng" }, { status: 400 })
    }
    clearFailures(key)

    const sql = getDb()
    const hash = await hashPassword(next as string)
    await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${user.id}`
    try {
      await sql`
        INSERT INTO auth_audit_log (user_id, username, action)
        VALUES (${user.id}, ${user.username}, 'password_changed')
      `
    } catch (e) {
      console.error("auth audit log failed:", e)
    }

    // Re-issue the cookie without the forced-change flag.
    const token = await createSessionToken({ ...user, must_change_password: false })
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * SESSION_HOURS,
    })

    return Response.json({ ok: true })
  } catch (error) {
    console.error("Change password error:", error)
    return Response.json({ error: "Lỗi máy chủ" }, { status: 500 })
  }
}
