import { getDb, isDbAvailable } from "@/lib/db"

interface IoTLogEntry {
  device_id: number
  log_type: "input" | "output"
  data_type: string
  payload: Record<string, any>
  status: string
  error_message?: string
}

const MOCK_LOGS: IoTLogEntry[] = [
  {
    device_id: 1,
    log_type: "input",
    data_type: "environmental",
    payload: { temperature: 28.5, humidity: 65 },
    status: "processed",
  },
  {
    device_id: 2,
    log_type: "output",
    data_type: "camera_event",
    payload: { event_type: "motion_detected" },
    status: "processed",
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceIdParam = searchParams.get("device_id")
    const logType = searchParams.get("log_type")
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "100") || 100, 1), 1000)
    const offset = Math.max(Number.parseInt(searchParams.get("offset") || "0") || 0, 0)

    if (!isDbAvailable()) {
      return Response.json({ logs: MOCK_LOGS, total: MOCK_LOGS.length })
    }

    const sql = getDb()

    // Build the WHERE clause from every filter that was supplied (they used to
    // overwrite one another, and `.orderBy()` does not exist in postgres.js).
    const conditions = []
    if (deviceIdParam) {
      const deviceId = Number.parseInt(deviceIdParam)
      if (Number.isNaN(deviceId)) return Response.json({ error: "Invalid device_id" }, { status: 400 })
      conditions.push(sql`device_id = ${deviceId}`)
    }
    if (logType) conditions.push(sql`log_type = ${logType}`)
    const where = conditions.length
      ? sql`WHERE ${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}`
      : sql``

    const logs = await sql`
      SELECT * FROM iot_data_logging
      ${where}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const countResult = await sql`SELECT COUNT(*)::int AS total FROM iot_data_logging ${where}`

    return Response.json({
      logs,
      total: countResult[0].total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching IoT logs:", error)
    return Response.json({ error: "Failed to fetch IoT logs" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { device_id, log_type, data_type, payload, status, error_message } = await request.json()

    if (!device_id || !log_type || !data_type || !payload) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const payloadString = JSON.stringify(payload)
    const payloadSize = Buffer.byteLength(payloadString, "utf8")

    const result = await sql`
      INSERT INTO iot_data_logging (device_id, log_type, data_type, payload, payload_size, status, error_message)
       VALUES (${device_id}, ${log_type}, ${data_type}, ${sql.json(payload)}, ${payloadSize}, ${status || "received"}, ${error_message || null})
       RETURNING *`

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error logging IoT data:", error)
    return Response.json({ error: "Failed to log data" }, { status: 500 })
  }
}
