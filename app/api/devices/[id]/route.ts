import { getDb, isDbAvailable } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const device = await sql`SELECT * FROM devices WHERE id = ${id}`

    if (!device.length) {
      return Response.json({ error: "Device not found" }, { status: 404 })
    }

    return Response.json(device[0])
  } catch (error) {
    console.error("Error fetching device:", error)
    return Response.json({ error: "Failed to fetch device" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { name, type, latitude, longitude } = await request.json()

    if (!name || !type || latitude === undefined || longitude === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const result = await sql`
      UPDATE devices 
      SET name = ${name}, type = ${type}, latitude = ${latitude}, longitude = ${longitude}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (!result.length) {
      return Response.json({ error: "Device not found" }, { status: 404 })
    }

    return Response.json(result[0])
  } catch (error) {
    console.error("Error updating device:", error)
    return Response.json({ error: "Failed to update device" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    await sql`DELETE FROM alerts WHERE device_id = ${id}`
    await sql`DELETE FROM environmental_readings WHERE device_id = ${id}`
    await sql`DELETE FROM water_level_readings WHERE device_id = ${id}`
    await sql`DELETE FROM camera_events WHERE device_id = ${id}`

    const result = await sql`DELETE FROM devices WHERE id = ${id} RETURNING id`

    if (!result.length) {
      return Response.json({ error: "Device not found" }, { status: 404 })
    }

    return Response.json({ message: "Device deleted successfully" })
  } catch (error) {
    console.error("Error deleting device:", error)
    return Response.json({ error: "Failed to delete device" }, { status: 500 })
  }
}
