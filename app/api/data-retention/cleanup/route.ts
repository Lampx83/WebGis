import { getDb, isDbAvailable } from "@/lib/db"
import { runRetentionCleanup } from "@/lib/retention"

export async function POST(request: Request) {
  try {
    if (!isDbAvailable()) {
      return Response.json({ error: "Database not available" }, { status: 503 })
    }

    const results = await runRetentionCleanup(getDb())

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
