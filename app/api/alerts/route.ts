import { getDb, isDbAvailable, type Alert } from "@/lib/db"

const MOCK_ALERTS: Alert[] = [
  {
    id: 1,
    device_id: 3,
    alert_type: "water_level_warning",
    title: "High Water Level Detected",
    description: "Water level exceeds normal range at Station 3",
    severity: "high",
    status: "active",
    created_at: new Date().toISOString(),
    resolved_at: null,
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") || "active"
    const limit = Number.parseInt(searchParams.get("limit") || "50")

    if (!isDbAvailable()) {
      return Response.json(MOCK_ALERTS)
    }

    const sql = getDb()
    const alerts = await sql`
      SELECT a.*, d.name as device_name 
      FROM alerts a
      JOIN devices d ON a.device_id = d.id
      WHERE a.status = ${status}
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `

    return Response.json(alerts)
  } catch (error) {
    console.error("Error fetching alerts:", error)
    return Response.json(MOCK_ALERTS)
  }
}

export async function POST(request: Request) {
  try {
    const { device_id, alert_type, title, description, severity } = await request.json()

    if (!device_id || !alert_type || !title) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const result = await sql`
      INSERT INTO alerts (device_id, alert_type, title, description, severity)
      VALUES (${device_id}, ${alert_type}, ${title}, ${description || null}, ${severity || "medium"})
      RETURNING *
    `

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating alert:", error)
    return Response.json({ error: "Failed to create alert" }, { status: 500 })
  }
}
