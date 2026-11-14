import type postgres from "postgres"
import { evaluateThreshold, PARAMETER_TO_COLUMN } from "./thresholds"

type Sql = postgres.Sql

const SEVERITY_FOR = { alert: "high", warning: "medium" } as const
const RANK: Record<string, number> = { low: 1, medium: 2, high: 3 }

export const thresholdAlertType = (parameter: string) => `threshold:${parameter}`

/**
 * Evaluate the device's enabled thresholds against a freshly stored reading and keep `alerts` in sync:
 *  - new violation          -> one active alert (plus an alert_threshold_violations row)
 *  - worse violation        -> the active alert is escalated
 *  - value back to normal   -> the active alert is resolved
 * Runs inside the caller's transaction so a reading never lands without its alert.
 * `values` is keyed by reading column name (e.g. air_quality_index, water_level).
 */
export async function applyThresholdAlerts(tx: Sql, deviceId: number, values: Record<string, number | null>) {
  const thresholds = await tx`
    SELECT id, parameter_type, warning_threshold, alert_threshold, comparison_operator
    FROM threshold_configurations
    WHERE device_id = ${deviceId} AND enabled = true
  `

  for (const th of thresholds) {
    const column = PARAMETER_TO_COLUMN[th.parameter_type]
    const value = column ? values[column] : undefined
    if (value === undefined || value === null) continue // parameter not part of this reading

    const violation = evaluateThreshold(value, th.comparison_operator, th.warning_threshold, th.alert_threshold)
    const type = thresholdAlertType(th.parameter_type)

    const [active] = await tx`
      SELECT id, severity FROM alerts
      WHERE device_id = ${deviceId} AND alert_type = ${type} AND status = 'active'
      ORDER BY created_at DESC LIMIT 1
    `

    if (!violation) {
      if (active) {
        await tx`UPDATE alerts SET status = 'resolved', resolved_at = NOW() WHERE id = ${active.id}`
      }
      continue
    }

    const severity = SEVERITY_FOR[violation]
    const limit = violation === "alert" ? th.alert_threshold : th.warning_threshold
    const title = `${violation === "alert" ? "Vượt ngưỡng báo động" : "Vượt ngưỡng cảnh báo"}: ${th.parameter_type}`
    const description = `${th.parameter_type} = ${value} (ngưỡng ${th.comparison_operator} ${limit})`

    let alertId: number
    if (!active) {
      const [row] = await tx`
        INSERT INTO alerts (device_id, alert_type, title, description, severity)
        VALUES (${deviceId}, ${type}, ${title}, ${description}, ${severity})
        RETURNING id
      `
      alertId = row.id
    } else if (RANK[severity] > RANK[active.severity] ) {
      await tx`UPDATE alerts SET severity = ${severity}, title = ${title}, description = ${description} WHERE id = ${active.id}`
      alertId = active.id
    } else {
      continue // already alerting at this level or worse: no duplicate rows
    }

    await tx`
      INSERT INTO alert_threshold_violations (device_id, parameter_type, current_value, threshold_value, violation_type, alert_id)
      VALUES (${deviceId}, ${th.parameter_type}, ${value}, ${limit}, ${violation}, ${alertId})
    `
  }
}
