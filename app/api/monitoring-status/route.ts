import { getDb, isDbAvailable } from "@/lib/db"

const MOCK_STATUS = {
  modules: [
    {
      id: 1,
      name: "Air pollution detection",
      total_devices: 5,
      normal_count: 5,
      warning_count: 0,
      alarm_count: 0,
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      name: "CCTV Monitoring",
      total_devices: 6,
      normal_count: 6,
      warning_count: 0,
      alarm_count: 0,
      updated_at: new Date().toISOString(),
    },
    {
      id: 3,
      name: "Water Level Monitoring",
      total_devices: 6,
      normal_count: 5,
      warning_count: 1,
      alarm_count: 0,
      updated_at: new Date().toISOString(),
    },
  ],
  summary: {
    total_devices: 17,
    normal_count: 16,
    warning_count: 1,
    alarm_count: 0,
  },
}

// Which device types feed each module row. Module names come from the seed scripts.
const MODULE_DEVICE_TYPES: Record<string, string[]> = {
  air_quality: ["weather"],
  cctv: ["camera"],
  water_level: ["water_level"],
  maritime_security: ["camera"],
}

export async function GET() {
  try {
    if (!isDbAvailable()) {
      return Response.json(MOCK_STATUS)
    }

    const sql = getDb()
    const modules = await sql`SELECT * FROM monitoring_modules ORDER BY name`

    // Live per-device state. Active alerts are collapsed to the worst severity per device.
    const devices = await sql`
      SELECT
        d.type,
        d.status,
        COALESCE(
          MAX(CASE a.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END),
          0
        )::int AS worst_alert
      FROM devices d
      LEFT JOIN alerts a ON a.device_id = d.id AND a.status = 'active' AND a.resolved_at IS NULL
      GROUP BY d.id, d.type, d.status
    `

    // Alarm: device offline/error, or an active high-severity alert.
    // Warning: any other active alert. Normal: everything else.
    const classify = (d: { status: string; worst_alert: number }) =>
      d.status === "offline" || d.status === "error" || d.worst_alert >= 3
        ? "alarm"
        : d.worst_alert >= 1
          ? "warning"
          : "normal"

    const live = modules.map((m: any) => {
      const types = MODULE_DEVICE_TYPES[m.name]
      // Unknown module name: keep whatever the row holds rather than reporting zeros.
      if (!types) return m
      const scoped = devices.filter((d: any) => types.includes(d.type))
      const counts = { normal: 0, warning: 0, alarm: 0 }
      for (const d of scoped) counts[classify(d as any)]++
      return {
        ...m,
        total_devices: scoped.length,
        normal_count: counts.normal,
        warning_count: counts.warning,
        alarm_count: counts.alarm,
        updated_at: new Date().toISOString(),
      }
    })

    const status = {
      modules: live,
      summary: {
        total_devices: live.reduce((sum: number, m: any) => sum + m.total_devices, 0),
        normal_count: live.reduce((sum: number, m: any) => sum + m.normal_count, 0),
        warning_count: live.reduce((sum: number, m: any) => sum + m.warning_count, 0),
        alarm_count: live.reduce((sum: number, m: any) => sum + m.alarm_count, 0),
      },
    }

    return Response.json(status)
  } catch (error) {
    console.error("Error fetching monitoring status:", error)
    return Response.json({ error: "Failed to fetch monitoring status" }, { status: 500 })
  }
}
