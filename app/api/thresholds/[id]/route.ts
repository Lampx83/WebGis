import { getDb, isDbAvailable } from "@/lib/db"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const result = await sql`
      SELECT * FROM threshold_configurations WHERE id = ${Number.parseInt(id)}
    `

    if (!result.length) {
      return Response.json({ error: "Threshold not found" }, { status: 404 })
    }

    return Response.json(result[0])
  } catch (error) {
    console.error("Error fetching threshold:", error)
    return Response.json({ error: "Failed to fetch threshold" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { warning_threshold, alert_threshold, comparison_operator, enabled, description } = body

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const result = await sql`
      UPDATE threshold_configurations 
      SET warning_threshold = ${warning_threshold},
          alert_threshold = ${alert_threshold},
          comparison_operator = ${comparison_operator},
          enabled = ${enabled},
          description = ${description || null},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${Number.parseInt(id)}
      RETURNING *
    `

    if (!result.length) {
      return Response.json({ error: "Threshold not found" }, { status: 404 })
    }

    return Response.json(result[0])
  } catch (error) {
    console.error("Error updating threshold:", error)
    return Response.json({ error: "Failed to update threshold" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    await sql`
      DELETE FROM threshold_configurations WHERE id = ${Number.parseInt(id)}
    `

    return Response.json({ success: true })
  } catch (error) {
    console.error("Error deleting threshold:", error)
    return Response.json({ error: "Failed to delete threshold" }, { status: 500 })
  }
}
