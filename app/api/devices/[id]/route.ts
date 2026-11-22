import { getDb, isDbAvailable } from "@/lib/db"
import { authorize } from "@/lib/authz"
import { DEVICE_FIELDS, diffRecords, recordAudit, summarize } from "@/lib/audit"

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
  const auth = await authorize(request)
  if (!auth.ok) return auth.response
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
    const [before] = await sql`SELECT * FROM devices WHERE id = ${id}`
    const result = await sql`
      UPDATE devices 
      SET name = ${name}, type = ${type}, latitude = ${latitude}, longitude = ${longitude}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `

    if (!result.length) {
      return Response.json({ error: "Device not found" }, { status: 404 })
    }

    const changes = diffRecords(before, result[0], DEVICE_FIELDS)
    if (changes) {
      await recordAudit(auth.actor, { action: "device.update", resource_type: "device", resource_id: result[0].id, changes })
    }
    return Response.json(result[0])
  } catch (error) {
    console.error("Error updating device:", error)
    return Response.json({ error: "Failed to update device" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorize(request)
  if (!auth.ok) return auth.response
  try {
    const { id } = await params

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const [before] = await sql`SELECT * FROM devices WHERE id = ${id}`
    await sql`DELETE FROM alerts WHERE device_id = ${id}`
    await sql`DELETE FROM environmental_readings WHERE device_id = ${id}`
    await sql`DELETE FROM water_level_readings WHERE device_id = ${id}`
    await sql`DELETE FROM camera_events WHERE device_id = ${id}`

    const result = await sql`DELETE FROM devices WHERE id = ${id} RETURNING id`

    if (!result.length) {
      return Response.json({ error: "Device not found" }, { status: 404 })
    }

    await recordAudit(auth.actor, {
      action: "device.delete",
      resource_type: "device",
      resource_id: result[0].id,
      changes: { before: summarize(before, DEVICE_FIELDS) },
    })
    return Response.json({ message: "Device deleted successfully" })
  } catch (error) {
    console.error("Error deleting device:", error)
    return Response.json({ error: "Failed to delete device" }, { status: 500 })
  }
}
