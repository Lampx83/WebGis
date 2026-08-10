import { getDb, isDbAvailable } from "@/lib/db"
import { hashPassword, type Role } from "@/lib/auth"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { email, full_name, role, is_active, password } = body

    if (!isDbAvailable()) {
      return Response.json({ id: Number(id), email, full_name, role, is_active })
    }

    const validRole: Role = ["admin", "operator", "viewer"].includes(role) ? role : "viewer"
    const sql = getDb()

    if (password) {
      const hash = await hashPassword(password)
      await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${Number(id)}`
    }

    const rows = await sql`
      UPDATE users
      SET email = ${email || null},
          full_name = ${full_name || null},
          role = ${validRole},
          is_active = ${is_active ?? true},
          updated_at = NOW()
      WHERE id = ${Number(id)}
      RETURNING id, username, email, full_name, role, is_active
    `
    if (!rows[0]) return Response.json({ error: "Không tìm thấy người dùng" }, { status: 404 })
    return Response.json(rows[0])
  } catch (error) {
    console.error("Error updating user:", error)
    return Response.json({ error: "Lỗi cập nhật người dùng" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (Number(id) === 1) {
      return Response.json({ error: "Không thể xóa tài khoản quản trị gốc" }, { status: 400 })
    }
    if (!isDbAvailable()) return Response.json({ ok: true })

    const sql = getDb()
    await sql`DELETE FROM users WHERE id = ${Number(id)}`
    return Response.json({ ok: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return Response.json({ error: "Lỗi xóa người dùng" }, { status: 500 })
  }
}
