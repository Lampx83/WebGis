import { getDb, isDbAvailable } from "@/lib/db"
import { runRetentionCleanup } from "@/lib/retention"
import { authorize } from "@/lib/authz"
import { recordAudit } from "@/lib/audit"

export async function POST(request: Request) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.response
  try {
    if (!isDbAvailable()) {
      return Response.json({ error: "Database not available" }, { status: 503 })
    }

    const results = await runRetentionCleanup(getDb())

    await recordAudit(auth.actor, { action: "retention.cleanup", resource_type: "data_retention", changes: { after: results } })

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
