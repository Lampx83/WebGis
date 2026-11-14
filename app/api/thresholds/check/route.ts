import { getDb, isDbAvailable } from "@/lib/db"
import { evaluateThreshold } from "@/lib/thresholds"

export async function POST(request: Request) {
  try {
    const { device_id, parameter_type, current_value } = await request.json()

    if (!device_id || !parameter_type || current_value === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ violations: [] })
    }

    const sql = getDb()

    // Get applicable thresholds
    const thresholds = await sql`
      SELECT * FROM threshold_configurations
      WHERE device_id = ${device_id}
        AND parameter_type = ${parameter_type}
        AND enabled = true
    `

    const violations: any[] = []

    for (const threshold of thresholds) {
      const violationType = evaluateThreshold(
        current_value,
        threshold.comparison_operator,
        threshold.warning_threshold,
        threshold.alert_threshold,
      )
      if (violationType) {
        violations.push({
          threshold_id: threshold.id,
          violation_type: violationType,
          current_value,
          threshold_value: violationType === "alert" ? threshold.alert_threshold : threshold.warning_threshold,
        })
      }
    }

    return Response.json({ violations })
  } catch (error) {
    console.error("Error checking thresholds:", error)
    return Response.json({ violations: [], error: "Failed to check thresholds" }, { status: 500 })
  }
}
