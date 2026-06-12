import { getDb, isDbAvailable } from "@/lib/db"
import { subDays } from "date-fns"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const deviceId = searchParams.get("deviceId")
    const moduleType = searchParams.get("moduleType") // 'environmental', 'water_level', 'camera'
    const readingType = searchParams.get("readingType") // 'aqi', 'water_level', etc
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const aggregation = searchParams.get("aggregation") || "hourly" // hourly, daily, monthly

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not available", data: [] }, { status: 503 })
    }

    const sql = getDb()
    let query, results

    // Parse dates
    const start = startDate ? new Date(startDate) : subDays(new Date(), 30)
    const end = endDate ? new Date(endDate) : new Date()

    if (moduleType === "environmental" && readingType) {
      // Query environmental readings
      if (aggregation === "daily") {
        results = await sql`
          SELECT 
            device_id,
            DATE(created_at) as date,
            ROUND(AVG(${readingType}), 2) as avg_value,
            ROUND(MIN(${readingType}), 2) as min_value,
            ROUND(MAX(${readingType}), 2) as max_value,
            COUNT(*) as sample_count
          FROM environmental_readings
          WHERE device_id = ${Number.parseInt(deviceId || "1")}
            AND ${readingType} IS NOT NULL
            AND created_at >= ${start.toISOString()}
            AND created_at <= ${end.toISOString()}
          GROUP BY device_id, DATE(created_at)
          ORDER BY date DESC
          LIMIT 100
        `
      } else {
        // Hourly (default)
        results = await sql`
          SELECT * FROM readings_hourly
          WHERE device_id = ${Number.parseInt(deviceId || "1")}
            AND module_type = 'environmental'
            AND reading_type = ${readingType}
            AND hour_start >= ${start.toISOString()}
            AND hour_start <= ${end.toISOString()}
          ORDER BY hour_start DESC
          LIMIT 100
        `
      }
    } else if (moduleType === "water_level") {
      if (aggregation === "daily") {
        results = await sql`
          SELECT 
            device_id,
            DATE(created_at) as date,
            ROUND(AVG(water_level), 2) as avg_value,
            ROUND(MIN(water_level), 2) as min_value,
            ROUND(MAX(water_level), 2) as max_value,
            COUNT(*) as sample_count
          FROM water_level_readings
          WHERE device_id = ${Number.parseInt(deviceId || "1")}
            AND created_at >= ${start.toISOString()}
            AND created_at <= ${end.toISOString()}
          GROUP BY device_id, DATE(created_at)
          ORDER BY date DESC
          LIMIT 100
        `
      } else {
        results = await sql`
          SELECT * FROM readings_hourly
          WHERE device_id = ${Number.parseInt(deviceId || "1")}
            AND module_type = 'water_level'
            AND hour_start >= ${start.toISOString()}
            AND hour_start <= ${end.toISOString()}
          ORDER BY hour_start DESC
          LIMIT 100
        `
      }
    } else if (moduleType === "camera") {
      results = await sql`
        SELECT 
          device_id,
          DATE(created_at) as date,
          event_type,
          COUNT(*) as count,
          severity
        FROM camera_events
        WHERE device_id = ${Number.parseInt(deviceId || "1")}
          AND created_at >= ${start.toISOString()}
          AND created_at <= ${end.toISOString()}
        GROUP BY device_id, DATE(created_at), event_type, severity
        ORDER BY date DESC
        LIMIT 100
      `
    }

    return Response.json({ success: true, data: results || [] })
  } catch (error) {
    console.error("Error fetching historical data:", error)
    return Response.json({ error: "Failed to fetch historical data", data: [] }, { status: 500 })
  }
}
