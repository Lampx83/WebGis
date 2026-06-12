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
    return Response.json(MOCK_ENV_READINGS)
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const device = await sql`SELECT type FROM devices WHERE id = ${id}`

    if (!device.length) {
      return Response.json({ error: "Device not found" }, { status: 404 })
    }

    const deviceType = device[0].type

    if (deviceType === "water_level") {
      const { water_level, predicted_value, alarm_level, status } = body
      const result = await sql`
        INSERT INTO water_level_readings (device_id, water_level, predicted_value, alarm_level, status)
        VALUES (${id}, ${water_level}, ${predicted_value || null}, ${alarm_level || null}, ${status || "normal"})
        RETURNING *
      `
      return Response.json(result[0], { status: 201 })
    } else {
      const { temperature, humidity, wind_speed, wind_direction, rainfall, air_quality_index, pm25, pm10 } = body
      const result = await sql`
        INSERT INTO environmental_readings (device_id, temperature, humidity, wind_speed, wind_direction, rainfall, air_quality_index, pm25, pm10)
        VALUES (${id}, ${temperature || null}, ${humidity || null}, ${wind_speed || null}, ${wind_direction || null}, ${rainfall || null}, ${air_quality_index || null}, ${pm25 || null}, ${pm10 || null})
        RETURNING *
      `
      return Response.json(result[0], { status: 201 })
    }
  } catch (error) {
    console.error("Error creating reading:", error)
    return Response.json({ error: "Failed to create reading" }, { status: 500 })
  }
}
