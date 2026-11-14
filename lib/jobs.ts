// Background maintenance that must not depend on someone having the dashboard open:
//   - device health: mark silent devices offline / raise battery alerts, resolve them on recovery
//   - hourly aggregation: fill readings_hourly (the statistical reports read it)
//   - retention cleanup (opt-in via AUTO_RETENTION_CLEANUP=true)
//
// Runs in-process from instrumentation.ts. Every run takes a transaction-level
// Postgres advisory lock, so with several replicas only one executes a given job at a time.
import type postgres from "postgres"
import { getDb, isDbAvailable } from "./db"
import { deleteExpiredData } from "./retention"

type Sql = postgres.Sql
type Tx = postgres.TransactionSql

// Arbitrary but fixed lock keys, one per job.
const LOCK = { health: 74001, aggregate: 74002, cleanup: 74003 } as const

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export const jobConfig = () => ({
  offlineMinutes: num(process.env.DEVICE_OFFLINE_MINUTES, 15),
  lowBatteryPercent: num(process.env.LOW_BATTERY_PERCENT, 20),
  healthIntervalMs: num(process.env.HEALTH_CHECK_INTERVAL_SECONDS, 60) * 1000,
  autoCleanup: process.env.AUTO_RETENTION_CLEANUP === "true",
})

/** Run `fn` inside a transaction only if no other process holds the job's lock. */
async function withLock<T>(sql: Sql, key: number, fn: (tx: Tx) => Promise<T>): Promise<T | null> {
  const result = await sql.begin(async (tx) => {
    const [{ locked }] = await tx`SELECT pg_try_advisory_xact_lock(${key}) AS locked`
    return locked ? fn(tx) : null
  })
  return result as unknown as T | null
}

export async function checkDeviceHealth(sql: Sql) {
  const { offlineMinutes, lowBatteryPercent } = jobConfig()
  return withLock(sql, LOCK.health, async (tx) => {
    // 1. Devices that stopped reporting -> offline (+ one alert each).
    const [gone] = await tx`
      WITH went_offline AS (
        UPDATE devices SET status = 'offline', updated_at = NOW()
        WHERE status = 'online' AND last_signal_time < NOW() - make_interval(mins => ${offlineMinutes})
        RETURNING id, name
      ), new_alerts AS (
        INSERT INTO alerts (device_id, alert_type, title, description, severity)
        SELECT w.id, 'device_signal', 'Mất kết nối thiết bị: ' || w.name,
               'Không nhận được tín hiệu trong ' || ${offlineMinutes}::text || ' phút', 'high'
        FROM went_offline w
        WHERE NOT EXISTS (
          SELECT 1 FROM alerts a WHERE a.device_id = w.id AND a.alert_type = 'device_signal' AND a.status = 'active'
        )
        RETURNING id
      )
      SELECT (SELECT count(*) FROM went_offline)::int AS offline, (SELECT count(*) FROM new_alerts)::int AS alerts
    `
    // 2. Devices that are back online -> resolve their signal alert.
    const recovered = await tx`
      UPDATE alerts SET status = 'resolved', resolved_at = NOW()
      WHERE alert_type = 'device_signal' AND status = 'active'
        AND device_id IN (SELECT id FROM devices WHERE status = 'online')
      RETURNING id
    `
    // 3. Low battery.
    const [bat] = await tx`
      WITH low AS (
        SELECT id, name, battery_level FROM devices WHERE battery_level < ${lowBatteryPercent}
      ), new_alerts AS (
        INSERT INTO alerts (device_id, alert_type, title, description, severity)
        SELECT l.id, 'battery', 'Pin yếu: ' || l.name, 'Mức pin còn ' || l.battery_level::text || '%', 'medium'
        FROM low l
        WHERE NOT EXISTS (
          SELECT 1 FROM alerts a WHERE a.device_id = l.id AND a.alert_type = 'battery' AND a.status = 'active'
        )
        RETURNING id
      )
      SELECT count(*)::int AS alerts FROM new_alerts
    `
    const batteryOk = await tx`
      UPDATE alerts SET status = 'resolved', resolved_at = NOW()
      WHERE alert_type = 'battery' AND status = 'active'
        AND device_id IN (SELECT id FROM devices WHERE battery_level >= ${lowBatteryPercent})
      RETURNING id
    `
    return {
      wentOffline: gone.offline,
      signalAlerts: gone.alerts,
      recovered: recovered.length,
      batteryAlerts: bat.alerts,
      batteryResolved: batteryOk.length,
    }
  })
}

/** Aggregate finished hours of the last 48h into readings_hourly (idempotent). */
export async function aggregateHourly(sql: Sql) {
  return withLock(sql, LOCK.aggregate, async (tx) => {
    const env = await tx`
      INSERT INTO readings_hourly (device_id, module_type, reading_type, avg_value, min_value, max_value, sample_count, hour_start)
      SELECT r.device_id, 'environmental', v.reading_type,
             ROUND(AVG(v.value), 2), ROUND(MIN(v.value), 2), ROUND(MAX(v.value), 2), COUNT(*)::int,
             date_trunc('hour', r.created_at)
      FROM environmental_readings r
      CROSS JOIN LATERAL (VALUES
        ('temperature', r.temperature::numeric), ('humidity', r.humidity::numeric),
        ('wind_speed', r.wind_speed::numeric), ('rainfall', r.rainfall::numeric),
        ('aqi', r.air_quality_index::numeric), ('pm25', r.pm25::numeric), ('pm10', r.pm10::numeric)
      ) AS v(reading_type, value)
      WHERE v.value IS NOT NULL
        AND r.created_at >= NOW() - INTERVAL '48 hours'
        AND r.created_at < date_trunc('hour', NOW())
        AND NOT EXISTS (
          SELECT 1 FROM readings_hourly h
          WHERE h.device_id = r.device_id AND h.module_type = 'environmental'
            AND h.reading_type = v.reading_type AND h.hour_start = date_trunc('hour', r.created_at)
        )
      GROUP BY r.device_id, v.reading_type, date_trunc('hour', r.created_at)
      RETURNING id
    `
    const water = await tx`
      INSERT INTO readings_hourly (device_id, module_type, reading_type, avg_value, min_value, max_value, sample_count, hour_start)
      SELECT w.device_id, 'water_level', 'water_level',
             ROUND(AVG(w.water_level), 2), ROUND(MIN(w.water_level), 2), ROUND(MAX(w.water_level), 2), COUNT(*)::int,
             date_trunc('hour', w.created_at)
      FROM water_level_readings w
      WHERE w.created_at >= NOW() - INTERVAL '48 hours'
        AND w.created_at < date_trunc('hour', NOW())
        AND NOT EXISTS (
          SELECT 1 FROM readings_hourly h
          WHERE h.device_id = w.device_id AND h.module_type = 'water_level' AND h.hour_start = date_trunc('hour', w.created_at)
        )
      GROUP BY w.device_id, date_trunc('hour', w.created_at)
      RETURNING id
    `
    return { environmental: env.length, water_level: water.length }
  })
}

/** Cleanup at most once per 24h, judged from data_archival_log so restarts don't re-run it. */
export async function maybeRunCleanup(sql: Sql) {
  return withLock(sql, LOCK.cleanup, async (tx) => {
    const [last] = await tx`SELECT max(archived_date) AS last FROM data_archival_log`
    if (last.last && Date.now() - new Date(last.last + "Z").getTime() < 24 * 60 * 60 * 1000) return null
    return deleteExpiredData(tx)
  })
}

const g = globalThis as unknown as { __jobsStarted?: boolean }

async function safely(name: string, fn: () => Promise<unknown>) {
  try {
    const out = await fn()
    if (out) console.log(`[jobs] ${name}:`, JSON.stringify(out))
  } catch (e) {
    console.error(`[jobs] ${name} failed:`, e)
  }
}

export function startJobs() {
  if (g.__jobsStarted || process.env.DISABLE_JOBS === "true" || !isDbAvailable()) return
  g.__jobsStarted = true
  const cfg = jobConfig()
  const sql = getDb()

  const health = () => safely("device-health", () => checkDeviceHealth(sql))
  const hourly = async () => {
    await safely("hourly-aggregation", () => aggregateHourly(sql))
    if (cfg.autoCleanup) await safely("retention-cleanup", () => maybeRunCleanup(sql))
  }

  const timers = [setInterval(health, cfg.healthIntervalMs), setInterval(hourly, 60 * 60 * 1000)]
  timers.forEach((t) => t.unref?.()) // never keep the process alive just for the jobs
  setTimeout(health, 15_000).unref?.()
  setTimeout(hourly, 45_000).unref?.()
  console.log(
    `[jobs] started: offline after ${cfg.offlineMinutes} min, health every ${cfg.healthIntervalMs / 1000}s, ` +
      `auto cleanup ${cfg.autoCleanup ? "ON" : "off"}`,
  )
}
