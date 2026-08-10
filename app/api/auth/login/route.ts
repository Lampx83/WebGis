import { cookies } from "next/headers"
import { authenticate, createSessionToken, COOKIE_NAME } from "@/lib/auth"
import { getDb, isDbAvailable } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()
    if (!username || !password) {
      return Response.json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" }, { status: 400 })
    }

    const user = await authenticate(username, password)

    if (isDbAvailable()) {
      try {
        const sql = getDb()
        const ua = request.headers.get("user-agent") || ""
        const ip = request.headers.get("x-forwarded-for") || ""
        await sql`
          INSERT INTO auth_audit_log (user_id, username, action, ip_address, user_agent)
          VALUES (${user?.id ?? null}, ${username}, ${user ? "login_success" : "login_failed"}, ${ip}, ${ua})
        `
        if (user) {
          await sql`UPDATE users SET last_login = NOW() WHERE id = ${user.id}`
        }
      } catch (e) {
        console.error("auth audit log failed:", e)
      }
    }

    if (!user) {
      return Response.json({ error: "Sai tên đăng nhập hoặc mật khẩu" }, { status: 401 })
    }

    const token = await createSessionToken(user)
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    })

    return Response.json({ user })
  } catch (error) {
    console.error("Login error:", error)
    return Response.json({ error: "Lỗi máy chủ" }, { status: 500 })
  }
}
