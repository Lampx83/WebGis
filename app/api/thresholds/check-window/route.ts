import { getDb, isDbAvailable } from "@/lib/db"

interface AnomalyResult {
  device_id: number
  parameter_type: string
  anomaly_detected: boolean
  violation_percentage: number
  readings_count: number
  violations_count: number
  max_value: number
  avg_value: number
  threshold_80_percent: number
  message: string
}

export async function POST(request: Request) {
  try {
    const { device_id, parameter_type } = await request.json()

    if (!device_id || !parameter_type) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate mock data if database is unavailable
    if (!isDbAvailable()) {
      const mockAnomalies: AnomalyResult[] = [
        {
          device_id: 1,
          parameter_type: "wind_speed",
          anomaly_detected: true,
          violation_percentage: 35.5,
          readings_count: 60,
          violations_count: 21,
          max_value: 28.5,
          avg_value: 18.2,
          threshold_80_percent: 24.0,
          message: "Wind speed exceeded 80% threshold (24.0 m/s) in 35.5% of readings in the last hour",
        },
      ]
      return Response.json({ anomalies: mockAnomalies })
    }

    const sql = getDb()

    // Get the alert threshold for this device and parameter
    const thresholds = await sql`
      SELECT alert_threshold, comparison_operator 
      FROM threshold_configurations
      WHERE device_id = ${device_id}
        AND parameter_type = ${parameter_type}
        AND enabled = true
      LIMIT 1
    `

    if (!thresholds.length) {
      return Response.json({ anomalies: [] })
    }

    const threshold = thresholds[0]
    const threshold_80_percent = threshold.alert_threshold * 0.8

    // Query readings from the last 60 minutes
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    let readings
    if (parameter_type === "wind_speed" || parameter_type === "rainfall" || parameter_type === "water_level") {
      if (parameter_type === "wind_speed") {
        readings = await sql`
          SELECT 
            wind_speed as value,
            created_at
          FROM environmental_readings
          WHERE device_id = ${device_id}
            AND wind_speed IS NOT NULL
            AND created_at >= ${oneHourAgo}
          ORDER BY created_at DESC
        `
      } else if (parameter_type === "rainfall") {
        readings = await sql`
          SELECT 
            rainfall as value,
            created_at
          FROM environmental_readings
          WHERE device_id = ${device_id}
            AND rainfall IS NOT NULL
            AND created_at >= ${oneHourAgo}
          ORDER BY created_at DESC
        `
      } else if (parameter_type === "water_level") {
        readings = await sql`
          SELECT 
            water_level as value,
            created_at
          FROM environmental_readings
          WHERE device_id = ${device_id}
            AND water_level IS NOT NULL
            AND created_at >= ${oneHourAgo}
          ORDER BY created_at DESC
        `
      }
    } else {
      return Response.json({ anomalies: [] })
    }

    if (readings.length === 0) {
      return Response.json({ anomalies: [] })
    }

    // Calculate statistics
    const values = readings.map((r: any) => r.value)
    const maxValue = Math.max(...values)
    const avgValue = values.reduce((a: number, b: number) => a + b, 0) / values.length
    const minValue = Math.min(...values)

    // Count violations (readings exceeding 80% of alert threshold)
    let violationsCount = 0
    for (const reading of readings) {
      if (threshold.comparison_operator === ">") {
        if (reading.value > threshold_80_percent) {
          violationsCount++
        }
      } else if (threshold.comparison_operator === "<") {
        if (reading.value < threshold_80_percent) {
          violationsCount++
        }
      } else if (threshold.comparison_operator === ">=") {
        if (reading.value >= threshold_80_percent) {
          violationsCount++
        }
      } else if (threshold.comparison_operator === "<=") {
        if (reading.value <= threshold_80_percent) {
          violationsCount++
        }
      }
    }

    const violationPercentage = (violationsCount / readings.length) * 100

    // Anomaly is detected if violation percentage >= 20% (80% threshold was reached in 20% of readings)
    const anomalyDetected = violationPercentage >= 20

    let message = ""
    if (anomalyDetected) {
      message = `${parameter_type.replace(/_/g, " ")} exceeded 80% threshold (${threshold_80_percent.toFixed(2)}) in ${violationPercentage.toFixed(1)}% of readings in the last hour`
    }

    const anomaly: AnomalyResult = {
      device_id,
      parameter_type,
      anomaly_detected: anomalyDetected,
      violation_percentage: violationPercentage,
      readings_count: readings.length,
      violations_count: violationsCount,
      max_value: maxValue,
      avg_value: avgValue,
      threshold_80_percent,
      message,
    }

    // Save anomaly record if anomaly detected
    if (anomalyDetected) {
      try {
        const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
        const windowEnd = new Date().toISOString()

        await sql`
          INSERT INTO environmental_anomalies 
          (device_id, parameter_type, anomaly_detected, violation_percentage, readings_count, violations_count, max_value, avg_value, threshold_80_percent, window_start, window_end)
          VALUES (${device_id}, ${parameter_type}, true, ${violationPercentage}, ${readings.length}, ${violationsCount}, ${maxValue}, ${avgValue}, ${threshold_80_percent}, ${windowStart}, ${windowEnd})
        `
      } catch (error) {
        console.error("Failed to save anomaly record:", error)
      }
    }

    return Response.json({ anomalies: anomalyDetected ? [anomaly] : [] })
  } catch (error) {
    console.error("Error checking window thresholds:", error)
    return Response.json({ anomalies: [], error: "Failed to check thresholds" }, { status: 500 })
  }
}
