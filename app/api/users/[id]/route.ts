import { getDb, isDbAvailable } from "@/lib/db"
import { hashPassword, validateNewPassword, type Role } from "@/lib/auth"
import { authorize } from "@/lib/authz"
import { bumpTokenVersion } from "@/lib/session-check"
import { planUserUpdateAudit, recordAudit, recordAuditAll, summarize, USER_FIELDS } from "@/lib/audit"

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    const body = await request.json()
    const { email, full_name, role, is_active, password } = body

    if (password) {
      const pwProblem = validateNewPassword(password)
      if (pwProblem) return Response.json({ error: pwProblem }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ id: Number(id), email, full_name, role, is_active })
    }

    const userId = Number(id)
    const sql = getDb()
    const [before] = await sql`SELECT id, username, email, full_name, role, is_active FROM users WHERE id = ${userId}`
    if (!before) return Response.json({ error: "Không tìm thấy người dùng" }, { status: 404 })

    // Fields missing from the body keep their current value.
    const validRole: Role = ["admin", "operator", "viewer"].includes(role) ? role : before.role
    const nextEmail = email === undefined ? before.email : email || null
    const nextName = full_name === undefined ? before.full_name : full_name || null
    const nextActive = typeof is_active === "boolean" ? is_active : before.is_active

    if (password) {
      const hash = await hashPassword(password)
      await sql`UPDATE users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${userId}`
    }

    const rows = await sql`
      UPDATE users
      SET email = ${nextEmail},
          full_name = ${nextName},
          role = ${validRole},
          is_active = ${nextActive},
          updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id, username, email, full_name, role, is_active
    `
    const after = rows[0]
    if (!after) return Response.json({ error: "Không tìm thấy người dùng" }, { status: 404 })

    // Anything that changes what this account may do (or its credentials) also kills its existing sessions,
    // so a later re-activation / re-promotion cannot resurrect an old token.
    if (password || before.role !== after.role || before.is_active !== after.is_active) {
      await bumpTokenVersion(userId)
    }

    await recordAuditAll(auth.actor, planUserUpdateAudit(userId, before, after, !!password))
    return Response.json(after)
  } catch (error) {
    console.error("Error updating user:", error)
    return Response.json({ error: "Lỗi cập nhật người dùng" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.response
  try {
    const { id } = await params
    if (Number(id) === 1) {
      return Response.json({ error: "Không thể xóa tài khoản quản trị gốc" }, { status: 400 })
    }
    if (!isDbAvailable()) return Response.json({ ok: true })

    const sql = getDb()
    const deleted = await sql`DELETE FROM users WHERE id = ${Number(id)} RETURNING id, username, email, full_name, role, is_active`
    if (deleted[0]) {
      await recordAudit(auth.actor, {
        action: "user.delete",
        resource_type: "user",
        resource_id: deleted[0].id,
        changes: { before: summarize(deleted[0], USER_FIELDS) },
      })
    }
    return Response.json({ ok: true })
  } catch (error) {
    console.error("Error deleting user:", error)
    return Response.json({ error: "Lỗi xóa người dùng" }, { status: 500 })
  }
}
