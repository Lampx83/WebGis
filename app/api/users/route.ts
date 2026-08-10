import { getDb, isDbAvailable } from "@/lib/db"
import { hashPassword, type Role } from "@/lib/auth"

const MOCK_USERS = [
  { id: 1, username: "admin", email: "admin@webgis.local", full_name: "Quản trị hệ thống", role: "admin", is_active: true, last_login: null, created_at: new Date().toISOString() },
]

export async function GET() {
  if (!isDbAvailable()) return Response.json(MOCK_USERS)
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT id, username, email, full_name, role, is_active, last_login, created_at
      FROM users ORDER BY id ASC
    `
    return Response.json(rows)
  } catch (error) {
    console.error("Error listing users:", error)
    return Response.json(MOCK_USERS)
  }
}

export async function POST(request: Request) {
  try {
    const { username, password, email, full_name, role } = await request.json()
    if (!username || !password) {
      return Response.json({ error: "Thiếu tên đăng nhập hoặc mật khẩu" }, { status: 400 })
    }
    const validRole: Role = ["admin", "operator", "viewer"].includes(role) ? role : "viewer"

    if (!isDbAvailable()) {
      return Response.json({ id: Date.now(), username, email, full_name, role: validRole, is_active: true })
    }

    const sql = getDb()
    const hash = await hashPassword(password)
    const rows = await sql`
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES (${username}, ${email || null}, ${hash}, ${full_name || null}, ${validRole})
      RETURNING id, username, email, full_name, role, is_active, created_at
    `
    return Response.json(rows[0], { status: 201 })
  } catch (error: any) {
    console.error("Error creating user:", error)
    if (String(error?.message || "").includes("duplicate")) {
      return Response.json({ error: "Tên đăng nhập hoặc email đã tồn tại" }, { status: 409 })
    }
    return Response.json({ error: "Lỗi tạo người dùng" }, { status: 500 })
  }
}
