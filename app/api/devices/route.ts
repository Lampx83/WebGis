import { getDb, isDbAvailable, type Device } from "@/lib/db"

const MOCK_DEVICES: Device[] = [
  {
    id: 1,
    device_id: "WS001",
    name: "Weather Station 1",
    type: "weather",
    latitude: 20.8447,
    longitude: 106.6882,
    status: "online",
    last_signal_time: new Date().toISOString(),
    battery_level: 95,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    device_id: "CAM001",
    name: "CCTV Camera 1",
    type: "camera",
    latitude: 20.845,
    longitude: 106.689,
    status: "online",
    last_signal_time: new Date().toISOString(),
    battery_level: 85,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    device_id: "WL001",
    name: "Water Level Sensor 1",
    type: "water_level",
    latitude: 20.844,
    longitude: 106.6875,
    status: "online",
    last_signal_time: new Date().toISOString(),
    battery_level: 78,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 4,
    device_id: "CAM002",
    name: "CCTV Camera 2",
    type: "camera",
    latitude: 20.8455,
    longitude: 106.6895,
    status: "online",
    last_signal_time: new Date().toISOString(),
    battery_level: 92,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 5,
    device_id: "WL002",
    name: "Water Level Sensor 2",
    type: "water_level",
    latitude: 20.8445,
    longitude: 106.688,
    status: "online",
    last_signal_time: new Date().toISOString(),
    battery_level: 88,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export async function GET() {
  try {
    if (!isDbAvailable()) {
      return Response.json(MOCK_DEVICES)
    }

    const sql = getDb()
    const devices = await sql`SELECT * FROM devices ORDER BY updated_at DESC`
    return Response.json(devices)
  } catch (error) {
    console.error("Error fetching devices:", error)
    return Response.json(MOCK_DEVICES)
  }
}

export async function POST(request: Request) {
  try {
    const { device_id, name, type, latitude, longitude, battery_level } = await request.json()

    if (!device_id || !name || !type || latitude === undefined || longitude === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const result = await sql`
      INSERT INTO devices (device_id, name, type, latitude, longitude, battery_level)
      VALUES (${device_id}, ${name}, ${type}, ${latitude}, ${longitude}, ${battery_level || 100})
      RETURNING *
    `

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating device:", error)
    return Response.json({ error: "Failed to create device" }, { status: 500 })
  }
}
