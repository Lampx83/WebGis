import { getDb, isDbAvailable } from "@/lib/db"
import { subDays } from "date-fns"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId")
    const moduleType = searchParams.get("moduleType")
    const readingType = searchParams.get("readingType")
    const days = Number.parseInt(searchParams.get("days") || "30")

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not available", stats: {} }, { status: 503 })
    }

    const sql = getDb()
    const startDate = subDays(new Date(), days)
    let stats = {}

    if (moduleType === "environmental" && readingType) {
      const result = await sql`
        SELECT 
          ROUND(AVG(CAST(${readingType} AS FLOAT)), 2) as avg_value,
          ROUND(MIN(CAST(${readingType} AS FLOAT)), 2) as min_value,
          ROUND(MAX(CAST(${readingType} AS FLOAT)), 2) as max_value,
          ROUND(STDDEV(CAST(${readingType} AS FLOAT)), 2) as std_dev,
          COUNT(*) as sample_count
        FROM environmental_readings
        WHERE device_id = ${Number.parseInt(deviceId || "1")}
          AND ${readingType} IS NOT NULL
          AND created_at >= ${startDate.toISOString()}
      `
      stats = result[0] || {}
    } else if (moduleType === "water_level") {
      const result = await sql`
        SELECT 
          ROUND(AVG(water_level), 2) as avg_value,
          ROUND(MIN(water_level), 2) as min_value,
          ROUND(MAX(water_level), 2) as max_value,
          ROUND(STDDEV(water_level), 2) as std_dev,
          COUNT(*) as sample_count
        FROM water_level_readings
        WHERE device_id = ${Number.parseInt(deviceId || "1")}
          AND created_at >= ${startDate.toISOString()}
      `
      stats = result[0] || {}
    } else if (moduleType === "camera") {
      const result = await sql`
        SELECT 
          COUNT(*) as total_events,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity
        FROM camera_events
        WHERE device_id = ${Number.parseInt(deviceId || "1")}
          AND created_at >= ${startDate.toISOString()}
      `
      stats = result[0] || {}
    }

    return Response.json({ success: true, stats, period_days: days })
  } catch (error) {
    console.error("Error calculating statistics:", error)
    return Response.json({ error: "Failed to calculate statistics", stats: {} }, { status: 500 })
  }
}
