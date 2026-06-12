import { getDb, isDbAvailable } from "@/lib/db"
import { subDays } from "date-fns"

export async function POST(request: Request) {
  try {
    if (!isDbAvailable()) {
      return Response.json({ error: "Database not available" }, { status: 503 })
    }

    const sql = getDb()
    const results: Record<string, any> = {}

    // Delete environmental readings older than 30 days
    const envOldDate = subDays(new Date(), 30)
    const envDeleted = await sql`
      DELETE FROM environmental_readings
      WHERE created_at < ${envOldDate.toISOString()}
      RETURNING id
    `
    results.environmental_readings_deleted = envDeleted.length

    // Delete water level readings older than 30 days
    const waterOldDate = subDays(new Date(), 30)
    const waterDeleted = await sql`
      DELETE FROM water_level_readings
      WHERE created_at < ${waterOldDate.toISOString()}
      RETURNING id
    `
    results.water_level_readings_deleted = waterDeleted.length

    // Delete camera events older than 30 days
    const cameraOldDate = subDays(new Date(), 30)
    const cameraDeleted = await sql`
      DELETE FROM camera_events
      WHERE created_at < ${cameraOldDate.toISOString()}
      RETURNING id
    `
    results.camera_events_deleted = cameraDeleted.length

    // Delete hourly aggregations older than 1 year
    const hourlyOldDate = subDays(new Date(), 365)
    const hourlyDeleted = await sql`
      DELETE FROM readings_hourly
      WHERE hour_start < ${hourlyOldDate.toISOString()}
      RETURNING id
    `
    results.readings_hourly_deleted = hourlyDeleted.length

    // Log the cleanup operation
    await sql`
      INSERT INTO data_archival_log (table_name, records_archived, archived_date, retention_days)
      VALUES 
        ('environmental_readings', ${envDeleted.length}, NOW(), 30),
        ('water_level_readings', ${waterDeleted.length}, NOW(), 30),
        ('camera_events', ${cameraDeleted.length}, NOW(), 30),
        ('readings_hourly', ${hourlyDeleted.length}, NOW(), 365)
    `

    return Response.json({
      success: true,
      message: "Data cleanup completed",
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error during data cleanup:", error)
    return Response.json({ error: "Failed to cleanup data", success: false }, { status: 500 })
  }
}

// GET endpoint to check cleanup schedule
export async function GET() {
  return Response.json({
    message: "Data Retention & Cleanup Service",
    schedule: {
      detailed_data_retention: "30 days",
      hourly_aggregation_retention: "1 year",
      monthly_aggregation_retention: "permanent",
    },
    last_cleanup: "Check database archival_log table",
    next_recommended_cleanup: "Run POST request to trigger cleanup",
  })
}
