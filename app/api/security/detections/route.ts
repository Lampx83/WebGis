import { getDb, isDbAvailable } from "@/lib/db"

interface DetectionPayload {
  device_id: number
  detection_type: string
  confidence_score: number
  detected_objects: string
  image_url?: string
  video_url?: string
  video_duration?: number
  location_description?: string
  severity: string
}

const MOCK_DETECTIONS = [
  {
    id: 1,
    device_id: 3,
    detection_type: "unauthorized_access",
    confidence_score: 95.2,
    detected_objects: '["person", "suspicious_bag"]',
    image_url: "/api/placeholder?height=200&width=300&query=unauthorized+person",
    video_url: null,
    severity: "high",
    created_at: new Date(Date.now() - 5 * 60000).toISOString(),
    processed: false,
  },
  {
    id: 2,
    device_id: 4,
    detection_type: "vessel",
    confidence_score: 88.5,
    detected_objects: '["cargo_vessel", "container_ship"]',
    image_url: "/api/placeholder?height=200&width=300&query=cargo+vessel",
    video_url: null,
    severity: "medium",
    created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    processed: true,
  },
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "50")
    const processed = searchParams.get("processed")
    const severity = searchParams.get("severity")

    if (!isDbAvailable()) {
      return Response.json(MOCK_DETECTIONS.slice(0, limit))
    }

    const sql = getDb()
    let query = sql`SELECT * FROM object_detection_events WHERE 1=1`

    if (processed !== null) {
      query = sql`SELECT * FROM object_detection_events WHERE processed = ${processed === "true"}`
    }

    if (severity) {
      query = sql`SELECT * FROM object_detection_events WHERE severity = ${severity}`
    }

    if (processed !== null && severity) {
      query = sql`SELECT * FROM object_detection_events WHERE processed = ${processed === "true"} AND severity = ${severity}`
    }

    query = sql`${query} ORDER BY created_at DESC LIMIT ${limit}`

    const detections = await query
    return Response.json(detections)
  } catch (error) {
    console.error("Error fetching detections:", error)
    return Response.json(MOCK_DETECTIONS.slice(0, 50))
  }
}

export async function POST(request: Request) {
  try {
    const payload: DetectionPayload = await request.json()

    if (!payload.device_id || !payload.detection_type || payload.confidence_score === undefined) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json(
        {
          id: Math.random(),
          ...payload,
          created_at: new Date().toISOString(),
          processed: false,
        },
        { status: 201 },
      )
    }

    const sql = getDb()
    const result = await sql`
      INSERT INTO object_detection_events 
      (device_id, detection_type, confidence_score, detected_objects, image_url, video_url, video_duration, location_description, severity)
      VALUES (
        ${payload.device_id},
        ${payload.detection_type},
        ${payload.confidence_score},
        ${payload.detected_objects},
        ${payload.image_url || null},
        ${payload.video_url || null},
        ${payload.video_duration || null},
        ${payload.location_description || null},
        ${payload.severity || "medium"}
      )
      RETURNING *
    `

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating detection:", error)
    return Response.json({ error: "Failed to create detection" }, { status: 500 })
  }
}
