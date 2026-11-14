import { getDb, isDbAvailable } from "@/lib/db"

// Liveness/readiness probe for Docker, Portainer or an uptime monitor. Public and cheap;
// reveals only whether the app and its database answer, nothing about the data.
export const dynamic = "force-dynamic"

export async function GET() {
  const started = Date.now()
  if (!isDbAvailable()) {
    return Response.json({ status: "ok", database: "not_configured" })
  }
  try {
    await getDb()`SELECT 1`
    return Response.json({ status: "ok", database: "up", latency_ms: Date.now() - started })
  } catch (error) {
    console.error("Health check: database unreachable:", error)
    return Response.json({ status: "degraded", database: "down" }, { status: 503 })
  }
}
