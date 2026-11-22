import type postgres from "postgres"
import { authorize } from "@/lib/authz"
import { getDb, isDbAvailable } from "@/lib/db"

const SEVERITIES = ["low", "medium", "high"]

// Camera events (motion / alarm / connection_loss) for the CCTV module.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number.parseInt((await params).id)
    if (Number.isNaN(id)) return Response.json({ error: "Invalid device id" }, { status: 400 })

    if (!isDbAvailable()) return Response.json([])

    const limit = Math.min(
      Math.max(Number.parseInt(new URL(request.url).searchParams.get("limit") || "20") || 20, 1),
      200,
    )
    const sql = getDb()
    const events = await sql`
      SELECT * FROM camera_events
      WHERE device_id = ${id}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    return Response.json(events)
  } catch (error) {
    console.error("Error fetching camera events:", error)
    return Response.json({ error: "Failed to fetch camera events" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.response
  try {
    const id = Number.parseInt((await params).id)
    if (Number.isNaN(id)) return Response.json({ error: "Invalid device id" }, { status: 400 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body.event_type !== "string" || !body.event_type) {
      return Response.json({ error: "event_type is required" }, { status: 400 })
    }
    const severity = body.severity ?? "low"
    if (!SEVERITIES.includes(severity)) {
      return Response.json({ error: "severity must be low, medium or high" }, { status: 400 })
    }

    if (!isDbAvailable()) return Response.json({ error: "Database not configured" }, { status: 503 })

    const sql = getDb()
    const device = await sql`SELECT type FROM devices WHERE id = ${id}`
    if (!device.length) return Response.json({ error: "Device not found" }, { status: 404 })

    const result = await sql.begin(async (tx: postgres.Sql) => {
      const rows = await tx`
        INSERT INTO camera_events (device_id, event_type, description, severity)
        VALUES (${id}, ${body.event_type.slice(0, 50)}, ${body.description ?? null}, ${severity})
        RETURNING *
      `
      // Same heartbeat rule as readings: a device that reports is online.
      await tx`UPDATE devices SET last_signal_time = NOW(), status = 'online', updated_at = NOW() WHERE id = ${id}`
      return rows
    })
    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating camera event:", error)
    return Response.json({ error: "Failed to create camera event" }, { status: 500 })
  }
}
