import { cookies } from "next/headers"
import { verifySessionToken, COOKIE_NAME, type AuthUser } from "@/lib/auth"
import { getDb, isDbAvailable } from "@/lib/db"

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  const session = await verifySessionToken(token)
  if (!session) return Response.json({ user: null }, { status: 401 })

  let user: Partial<AuthUser> = {
    id: Number(session.sub),
    username: session.username,
    role: session.role,
  }

  if (isDbAvailable()) {
    try {
      const sql = getDb()
      const rows = await sql`
        SELECT id, username, email, full_name, role, is_active
        FROM users WHERE id = ${Number(session.sub)} LIMIT 1
      `
      if (rows[0]) user = rows[0] as any
    } catch (e) {
      console.error("me lookup failed:", e)
    }
  }

  return Response.json({ user })
}
