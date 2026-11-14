import type postgres from "postgres"
import { applyThresholdAlerts } from "@/lib/alerting"
import { getDb, isDbAvailable, type EnvironmentalReading, type WaterLevelReading } from "@/lib/db"

const MOCK_ENV_READINGS: EnvironmentalReading[] = [
  {
    id: 1,
    device_id: 1,
    temperature: 28.5,
    humidity: 75,
    wind_speed: 12.5,
    wind_direction: "NE",
    rainfall: 0.0,
    air_quality_index: 85,
    pm25: 42.3,
    pm10: 65.8,
    created_at: new Date().toISOString(),
  },
]

const MOCK_WATER_READINGS: WaterLevelReading[] = [
  {
    id: 1,
    device_id: 3,
    water_level: 2.68,
    predicted_value: 2.72,
    alarm_level: 3.25,
    status: "normal",
    created_at: new Date().toISOString(),
  },
]

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isDbAvailable()) {
      return Response.json(MOCK_ENV_READINGS)
    }

    const sql = getDb()
    const device = await sql`SELECT type FROM devices WHERE id = ${id}`

    if (!device.length) {
      return Response.json({ error: "Device not found" }, { status: 404 })
    }

    const deviceType = device[0].type
    let readings

    if (deviceType === "water_level") {
      readings = await sql`
        SELECT * FROM water_level_readings 
        WHERE device_id = ${id} 
        ORDER BY created_at DESC 
        LIMIT 24
      `
    } else {
      readings = await sql`
        SELECT * FROM environmental_readings 
        WHERE device_id = ${id} 
        ORDER BY created_at DESC 
        LIMIT 24
      `
    }

    return Response.json(readings)
  } catch (error) {
    console.error("Error fetching readings:", error)
    return Response.json({ error: "Failed to fetch readings" }, { status: 500 })
  }
}

/** undefined/null/"" -> null; a finite number -> number; anything else -> NaN (caller rejects). */
function numOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : Number.NaN
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params
    const id = Number.parseInt(idParam)
    if (Number.isNaN(id)) return Response.json({ error: "Invalid device id" }, { status: 400 })

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const device = await sql`SELECT type FROM devices WHERE id = ${id}`

    if (!device.length) {
      return Response.json({ error: "Device not found" }, { status: 404 })
    }

    const deviceType = device[0].type
    const battery = numOrNull(body.battery_level)
    if (Number.isNaN(battery)) return Response.json({ error: "Invalid battery_level" }, { status: 400 })

    // Every ingest is also a heartbeat: a device that reports is online, and its
    // last_signal_time / battery must move, otherwise offline detection is blind.
    const touchDevice = (tx: postgres.Sql) => tx`
      UPDATE devices
      SET last_signal_time = NOW(),
          status = 'online',
          battery_level = COALESCE(${battery}::int, battery_level),
          updated_at = NOW()
      WHERE id = ${id}
    `

    if (deviceType === "water_level") {
      const water_level = numOrNull(body.water_level)
      const predicted_value = numOrNull(body.predicted_value)
      const alarm_level = numOrNull(body.alarm_level)
      if (water_level === null || Number.isNaN(water_level) || Number.isNaN(predicted_value) || Number.isNaN(alarm_level)) {
        return Response.json({ error: "water_level (number) is required; numeric fields must be numbers" }, { status: 400 })
      }
      const result = await sql.begin(async (tx: postgres.Sql) => {
        const rows = await tx`
          INSERT INTO water_level_readings (device_id, water_level, predicted_value, alarm_level, status)
          VALUES (${id}, ${water_level}, ${predicted_value}, ${alarm_level}, ${body.status ?? "normal"})
          RETURNING *
        `
        await touchDevice(tx)
        await applyThresholdAlerts(tx, id, { water_level })
        return rows
      })
      return Response.json(result[0], { status: 201 })
    }

    // 0 is a real measurement (0 mm rain, 0 m/s wind, 0 °C) — only absent values become NULL.
    const fields = {
      temperature: numOrNull(body.temperature),
      humidity: numOrNull(body.humidity),
      wind_speed: numOrNull(body.wind_speed),
      rainfall: numOrNull(body.rainfall),
      air_quality_index: numOrNull(body.air_quality_index),
      pm25: numOrNull(body.pm25),
      pm10: numOrNull(body.pm10),
    }
    const bad = Object.entries(fields).find(([, v]) => Number.isNaN(v))
    if (bad) return Response.json({ error: `Invalid numeric value for ${bad[0]}` }, { status: 400 })
    const wind_direction = body.wind_direction ?? null

    const result = await sql.begin(async (tx: postgres.Sql) => {
      const rows = await tx`
        INSERT INTO environmental_readings (device_id, temperature, humidity, wind_speed, wind_direction, rainfall, air_quality_index, pm25, pm10)
        VALUES (${id}, ${fields.temperature}, ${fields.humidity}, ${fields.wind_speed}, ${wind_direction}, ${fields.rainfall}, ${fields.air_quality_index}, ${fields.pm25}, ${fields.pm10})
        RETURNING *
      `
      await touchDevice(tx)
      await applyThresholdAlerts(tx, id, {
        temperature: fields.temperature,
        humidity: fields.humidity,
        wind_speed: fields.wind_speed,
        rainfall: fields.rainfall,
        air_quality_index: fields.air_quality_index,
        pm25: fields.pm25,
        pm10: fields.pm10,
      })
      return rows
    })
    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating reading:", error)
    return Response.json({ error: "Failed to create reading" }, { status: 500 })
  }
}
