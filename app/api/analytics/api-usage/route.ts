import { getDb, isDbAvailable } from "@/lib/db"

interface ApiUsageStats {
  total_calls: number
  error_count: number
  success_count: number
  avg_response_time: number
  endpoints: Array<{
    endpoint: string
    method: string
    count: number
    avg_response_time: number
    error_count: number
  }>
}

const MOCK_STATS: ApiUsageStats = {
  total_calls: 1250,
  error_count: 5,
  success_count: 1245,
  avg_response_time: 125,
  endpoints: [
    { endpoint: "/api/devices", method: "GET", count: 450, avg_response_time: 50, error_count: 0 },
    { endpoint: "/api/alerts", method: "GET", count: 380, avg_response_time: 75, error_count: 2 },
    { endpoint: "/api/monitoring-status", method: "GET", count: 300, avg_response_time: 100, error_count: 1 },
  ],
}

// COUNT/SUM come back from Postgres as bigint -> string; AVG as numeric (parsed by lib/db).
const num = (v: unknown) => Number(v ?? 0) || 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(Number.parseInt(searchParams.get("days") || "7") || 7, 1), 365)
    const endpoint = searchParams.get("endpoint")

    // Sample data is only served when the app runs without a database at all.
    // A DB error below is reported as an error, never masked with fake numbers.
    if (!isDbAvailable()) {
      return Response.json(MOCK_STATS)
    }

    const sql = getDb()
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const endpointFilter = endpoint ? sql`AND endpoint = ${endpoint}` : sql``

    const endpointStats = await sql`
      SELECT
        endpoint,
        method,
        COUNT(*) AS count,
        AVG(response_time_ms) AS avg_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count
      FROM api_analytics
      WHERE created_at > ${startDate.toISOString()}
      ${endpointFilter}
      GROUP BY endpoint, method
      ORDER BY count DESC
    `

    const summaryResult = await sql`
      SELECT
        COUNT(*) AS total_calls,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
        SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) AS success_count,
        AVG(response_time_ms) AS avg_response_time
      FROM api_analytics
      WHERE created_at > ${startDate.toISOString()}
      ${endpointFilter}
    `

    const summary = summaryResult[0] ?? {}

    const stats: ApiUsageStats = {
      total_calls: num(summary.total_calls),
      error_count: num(summary.error_count),
      success_count: num(summary.success_count),
      avg_response_time: Math.round(num(summary.avg_response_time)),
      endpoints: endpointStats.map((stat: any) => ({
        endpoint: stat.endpoint,
        method: stat.method,
        count: num(stat.count),
        avg_response_time: Math.round(num(stat.avg_response_time)),
        error_count: num(stat.error_count),
      })),
    }
    return Response.json(stats)
  } catch (error) {
    console.error("Error fetching API analytics:", error)
    return Response.json({ error: "Failed to fetch API analytics" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { endpoint, method, status_code, response_time_ms, client_ip } = await request.json()

    if (!endpoint || !method) {
      return Response.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!isDbAvailable()) {
      return Response.json({ error: "Database not configured" }, { status: 503 })
    }

    const sql = getDb()
    const result = await sql`
      INSERT INTO api_analytics (endpoint, method, status_code, response_time_ms, client_ip)
      VALUES (
        ${String(endpoint).slice(0, 255)},
        ${String(method).slice(0, 10)},
        ${status_code ?? null},
        ${response_time_ms ?? null},
        ${client_ip ? String(client_ip).slice(0, 45) : null}
      )
      RETURNING *
    `

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error logging API usage:", error)
    return Response.json({ error: "Failed to log API usage" }, { status: 500 })
  }
}
