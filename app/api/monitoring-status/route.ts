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

export async function GET() {
  try {
    if (!isDbAvailable()) {
      return Response.json(MOCK_STATUS)
    }

    const sql = getDb()
    const modules = await sql`SELECT * FROM monitoring_modules ORDER BY name`

    const status = {
      modules: modules,
      summary: {
        total_devices: modules.reduce((sum, m) => sum + m.total_devices, 0),
        normal_count: modules.reduce((sum, m) => sum + m.normal_count, 0),
        warning_count: modules.reduce((sum, m) => sum + m.warning_count, 0),
        alarm_count: modules.reduce((sum, m) => sum + m.alarm_count, 0),
      },
    }

    return Response.json(status)
  } catch (error) {
    console.error("Error fetching monitoring status:", error)
    return Response.json(MOCK_STATUS)
  }
}
