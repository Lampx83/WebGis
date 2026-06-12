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
    const deviceId = searchParams.get("device_id")
    const logType = searchParams.get("log_type")
    const limit = Number.parseInt(searchParams.get("limit") || "100")
    const offset = Number.parseInt(searchParams.get("offset") || "0")

    if (!isDbAvailable()) {
      return Response.json({ logs: MOCK_LOGS, total: MOCK_LOGS.length })
    }

    const sql = getDb()
    let query = sql`SELECT * FROM iot_data_logging WHERE 1=1`

    if (deviceId) {
      query = sql`SELECT * FROM iot_data_logging WHERE device_id = ${Number.parseInt(deviceId)}`
    }

    if (logType) {
      query = sql`SELECT * FROM iot_data_logging WHERE log_type = ${logType}`
    }

    query = query.orderBy("created_at DESC").limit(limit).offset(offset)

    const logs = await query
    const countResult = await sql`SELECT COUNT(*) as total FROM iot_data_logging`

    return Response.json({
      logs: logs,
      total: countResult[0].total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("Error fetching IoT logs:", error)
    return Response.json({ logs: MOCK_LOGS, total: MOCK_LOGS.length })
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
       VALUES (${device_id}, ${log_type}, ${data_type}, ${payloadString}, ${payloadSize}, ${status || "received"}, ${error_message || null})
       RETURNING *`

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error logging IoT data:", error)
    return Response.json({ error: "Failed to log data" }, { status: 500 })
  }
}
