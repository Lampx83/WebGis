import { isDbAvailable } from "@/lib/db"
import { authorize } from "@/lib/authz"
import { listAudit, parsePaging } from "@/lib/audit"

// Admin-only (the /api/admin prefix is admin in lib/access-policy.ts; authorize() re-checks against the DB).
export async function GET(request: Request) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.response

  const params = new URL(request.url).searchParams
  const { page, pageSize, offset } = parsePaging(params)

  // Mock mode has no database to read from: nothing is recorded, so the log is empty.
  if (!isDbAvailable()) return Response.json({ items: [], total: 0, page, page_size: pageSize })

  try {
    const { items, total } = await listAudit({
      limit: pageSize,
      offset,
      action: params.get("action")?.trim().slice(0, 100) || undefined,
      resourceType: params.get("resource_type")?.trim().slice(0, 50) || undefined,
      actor: params.get("actor")?.trim().slice(0, 100) || undefined,
    })
    return Response.json({ items, total, page, page_size: pageSize })
  } catch (error) {
    console.error("Error listing audit log:", error)
    return Response.json({ error: "Không tải được nhật ký thao tác" }, { status: 500 })
  }
}
