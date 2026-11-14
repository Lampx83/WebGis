// Pure threshold logic shared by the API routes and the ingest-time alerting.

export type Violation = "alert" | "warning" | null

/**
 * Compare a value against a (warning, alert) pair.
 * `alert` wins over `warning`; unknown operators never violate.
 */
export function evaluateThreshold(value: number, operator: string, warning: number, alert: number): Violation {
  let cmp: (a: number, b: number) => boolean
  switch (operator) {
    case ">":
      cmp = (a, b) => a > b
      break
    case "<":
      cmp = (a, b) => a < b
      break
    case ">=":
      cmp = (a, b) => a >= b
      break
    case "<=":
      cmp = (a, b) => a <= b
      break
    default:
      return null
  }
  if (cmp(value, alert)) return "alert"
  if (cmp(value, warning)) return "warning"
  return null
}

/** threshold_configurations.parameter_type -> column of the reading row that holds its value. */
export const PARAMETER_TO_COLUMN: Record<string, string> = {
  temperature: "temperature",
  humidity: "humidity",
  wind_speed: "wind_speed",
  rainfall: "rainfall",
  aqi: "air_quality_index",
  pm25: "pm25",
  pm10: "pm10",
  water_level: "water_level",
}
