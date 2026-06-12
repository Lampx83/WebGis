import { getDb, isDbAvailable } from "@/lib/db"

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
      let violated = false
      let violationType = null

      // Check violation based on operator
      if (threshold.comparison_operator === ">") {
        if (current_value > threshold.alert_threshold) {
          violated = true
          violationType = "alert"
        } else if (current_value > threshold.warning_threshold) {
          violated = true
          violationType = "warning"
        }
      } else if (threshold.comparison_operator === "<") {
        if (current_value < threshold.alert_threshold) {
          violated = true
          violationType = "alert"
        } else if (current_value < threshold.warning_threshold) {
          violated = true
          violationType = "warning"
        }
      } else if (threshold.comparison_operator === ">=") {
        if (current_value >= threshold.alert_threshold) {
          violated = true
          violationType = "alert"
        } else if (current_value >= threshold.warning_threshold) {
          violated = true
          violationType = "warning"
        }
      } else if (threshold.comparison_operator === "<=") {
        if (current_value <= threshold.alert_threshold) {
          violated = true
          violationType = "alert"
        } else if (current_value <= threshold.warning_threshold) {
          violated = true
          violationType = "warning"
        }
      }

      if (violated) {
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
