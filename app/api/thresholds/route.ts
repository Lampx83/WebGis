import { getDb, isDbAvailable, type ThresholdConfiguration } from "@/lib/db"

const MOCK_THRESHOLDS: ThresholdConfiguration[] = [
  {
    id: 1,
    device_id: 1,
    parameter_type: "wind_speed",
    warning_threshold: 20.0,
    alert_threshold: 30.0,
    comparison_operator: ">",
    enabled: true,
    description: "Wind speed thresholds for weather station 1",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    updated_by: null,
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("device_id")
    const enabled = searchParams.get("enabled")

    if (!isDbAvailable()) {
      return Response.json(MOCK_THRESHOLDS)
    }

    const sql = getDb()
    const conditions = []
    if (deviceId) {
      const id = Number.parseInt(deviceId)
      if (Number.isNaN(id)) return Response.json({ error: "Invalid device_id" }, { status: 400 })
      conditions.push(sql`device_id = ${id}`)
    }
    if (enabled !== null) conditions.push(sql`enabled = ${enabled === "true"}`)
    const where = conditions.length
      ? sql`WHERE ${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}`
      : sql``

    const result = await sql`
      SELECT * FROM threshold_configurations
      ${where}
      ORDER BY device_id, parameter_type
    `
    return Response.json(result)
  } catch (error) {
    console.error("Error fetching thresholds:", error)
    return Response.json({ error: "Failed to fetch thresholds" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { device_id, parameter_type, warning_threshold, alert_threshold, comparison_operator, description } = body

    if (!device_id || !parameter_type || warning_threshold === undefined || alert_threshold === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const result = await sql`
      INSERT INTO threshold_configurations 
      (device_id, parameter_type, warning_threshold, alert_threshold, comparison_operator, description, enabled)
      VALUES (${device_id}, ${parameter_type}, ${warning_threshold}, ${alert_threshold}, ${comparison_operator || ">"}, ${description || null}, true)
      RETURNING *
    `

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating threshold:", error)
    return Response.json({ error: "Failed to create threshold" }, { status: 500 })
  }
}
