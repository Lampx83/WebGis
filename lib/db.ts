import postgres from "postgres"

// Singleton pattern for database connection.
// Cached on globalThis so Next.js hot-reload in dev doesn't open a new pool
// on every module re-evaluation.
const globalForDb = globalThis as unknown as { __sql?: postgres.Sql }

export function getDb() {
  if (!globalForDb.__sql) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      console.warn("DATABASE_URL not configured, using mock data mode")
      return null as any
    }
    // Use SSL only for managed providers (e.g. Neon); a local Postgres in the
    // same Docker network does not use TLS.
    const needsSsl = /sslmode=require|neon\.tech/.test(databaseUrl)
    globalForDb.__sql = postgres(databaseUrl, {
      ssl: needsSsl ? "require" : false,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idle_timeout: 30,
      types: {
        // postgres.js returns NUMERIC/DECIMAL as strings by default (to avoid
        // float precision loss). Every DECIMAL column in this app (scores,
        // coordinates, thresholds, readings) is declared `number` in the
        // TypeScript interfaces below, so parse it back to a JS number here
        // instead of at every call site.
        numeric: {
          to: 1700,
          from: [1700],
          serialize: (v: unknown) => String(v),
          parse: (v: string) => Number.parseFloat(v),
        },
      },
    })
  }
  return globalForDb.__sql
}

export function isDbAvailable(): boolean {
  return !!process.env.DATABASE_URL
}

export type DeviceType = "weather" | "camera" | "water_level"
export type DeviceStatus = "online" | "offline" | "error"
export type AlertStatus = "active" | "resolved" | "dismissed"
export type AlertSeverity = "low" | "medium" | "high"

export interface Device {
  id: number
  device_id: string
  name: string
  type: DeviceType
  latitude: number
  longitude: number
  status: DeviceStatus
  last_signal_time: string
  battery_level: number
  created_at: string
  updated_at: string
}

export interface EnvironmentalReading {
  id: number
  device_id: number
  temperature: number | null
  humidity: number | null
  wind_speed: number | null
  wind_direction: string | null
  rainfall: number | null
  air_quality_index: number | null
  pm25: number | null
  pm10: number | null
  created_at: string
}

export interface WaterLevelReading {
  id: number
  device_id: number
  water_level: number
  predicted_value: number | null
  alarm_level: number | null
  status: string
  created_at: string
}

export interface Alert {
  id: number
  device_id: number
  alert_type: string
  title: string
  description: string | null
  severity: AlertSeverity
  status: AlertStatus
  created_at: string
  resolved_at: string | null
}

export interface MonitoringModule {
  id: number
  name: string
  total_devices: number
  normal_count: number
  warning_count: number
  alarm_count: number
  updated_at: string
}

export interface ThresholdConfiguration {
  id: number
  device_id: number
  parameter_type: string
  warning_threshold: number
  alert_threshold: number
  comparison_operator: string
  enabled: boolean
  description: string | null
  created_at: string
  updated_at: string
  created_by: number | null
  updated_by: number | null
}

export interface AlertThresholdViolation {
  id: number
  device_id: number
  parameter_type: string
  current_value: number
  threshold_value: number
  violation_type: string
  alert_id: number | null
  created_at: string
}
