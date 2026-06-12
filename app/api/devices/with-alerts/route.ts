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
    const devicesWithAlerts = await sql`
      SELECT 
        d.*,
        CASE WHEN a.id IS NOT NULL THEN true ELSE false END as has_alert,
        a.alert_type,
        a.severity as alert_severity
      FROM devices d
      LEFT JOIN alerts a ON d.id = a.device_id AND a.resolved_at IS NULL
      ORDER BY d.updated_at DESC
    `

    return Response.json(devicesWithAlerts)
  } catch (error) {
    console.error("Error fetching devices with alerts:", error)
    return Response.json(MOCK_DEVICES_WITH_ALERTS)
  }
}
