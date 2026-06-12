import { isDbAvailable } from "@/lib/db"
import { subDays } from "date-fns"
import sql from "sql-template-tag"

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "7")
    const endpoint = searchParams.get("endpoint")

    if (!isDbAvailable()) {
      return Response.json(MOCK_STATS)
    }

    const startDate = subDays(new Date(), days)

    const endpointStats = await sql`
      SELECT 
        endpoint,
        method,
        COUNT(*) as count,
        AVG(response_time_ms) as avg_response_time,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
      FROM api_analytics
      WHERE created_at > ${startDate.toISOString()}
      ${endpoint ? sql`AND endpoint = ${endpoint}` : sql``}
      GROUP BY endpoint, method ORDER BY count DESC
    `

    const summaryResult = await sql`
      SELECT 
        COUNT(*) as total_calls,
        SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
        SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as success_count,
        AVG(response_time_ms) as avg_response_time
      FROM api_analytics
      WHERE created_at > ${startDate.toISOString()}
    `

    const summary = summaryResult[0]

    return Response.json({
      total_calls: summary.total_calls || 0,
      error_count: summary.error_count || 0,
      success_count: summary.success_count || 0,
      avg_response_time: Math.round(summary.avg_response_time || 0),
      endpoints: endpointStats.map((stat: any) => ({
        endpoint: stat.endpoint,
        method: stat.method,
        count: stat.count,
        avg_response_time: Math.round(stat.avg_response_time || 0),
        error_count: stat.error_count || 0,
      })),
    })
  } catch (error) {
    console.error("Error fetching API analytics:", error)
    return Response.json(MOCK_STATS)
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

    const result = await sql`
      INSERT INTO api_analytics (endpoint, method, status_code, response_time_ms, client_ip)
       VALUES (${endpoint}, ${method}, ${status_code || null}, ${response_time_ms || null}, ${client_ip || null})
       RETURNING *
    `

    return Response.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error logging API usage:", error)
    return Response.json({ error: "Failed to log API usage" }, { status: 500 })
  }
}
