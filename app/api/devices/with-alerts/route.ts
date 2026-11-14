import { getDb, isDbAvailable } from "@/lib/db"

const MOCK_DEVICES_WITH_ALERTS = [
  {
    id: 1,
    device_id: "WS001",
    name: "Weather Station 1",
    type: "weather",
    latitude: 20.8447,
    longitude: 106.6882,
    status: "online",
    battery_level: 95,
    has_alert: false,
    alert_type: null,
    alert_severity: null,
  },
  {
    id: 2,
    device_id: "CAM001",
    name: "CCTV Camera 1",
    type: "camera",
    latitude: 20.845,
    longitude: 106.689,
    status: "online",
    battery_level: 85,
    has_alert: true,
    alert_type: "warning",
    alert_severity: "warning",
  },
]

export async function GET() {
  try {
    if (!isDbAvailable()) {
      return Response.json(MOCK_DEVICES_WITH_ALERTS)
    }

    const sql = getDb()
    // One row per device (the old LEFT JOIN duplicated devices with several open alerts
    // and counted dismissed alerts): pick the worst *active* alert.
    const devicesWithAlerts = await sql`
      SELECT
        d.*,
        (a.id IS NOT NULL) AS has_alert,
        a.alert_type,
        a.severity AS alert_severity
      FROM devices d
      LEFT JOIN LATERAL (
        SELECT id, alert_type, severity
        FROM alerts
        WHERE device_id = d.id AND status = 'active' AND resolved_at IS NULL
        ORDER BY CASE severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END DESC,
                 created_at DESC
        LIMIT 1
      ) a ON true
      ORDER BY d.updated_at DESC
    `

    return Response.json(devicesWithAlerts)
  } catch (error) {
    console.error("Error fetching devices with alerts:", error)
    return Response.json({ error: "Failed to fetch devices with alerts" }, { status: 500 })
  }
}
