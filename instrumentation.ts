// Fail fast at server start-up when security-critical configuration is missing,
// instead of discovering it on the first login attempt.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const { getAuthSecret } = await import("./lib/session")
  getAuthSecret() // throws in production when AUTH_SECRET is missing/placeholder/short

  if (process.env.NODE_ENV === "production") {
    if (!process.env.DATABASE_URL && process.env.DEMO_MODE !== "true") {
      console.warn("[startup] DATABASE_URL is not set: the API will serve built-in sample data.")
    }
    if (!process.env.INGEST_API_KEY) {
      console.warn("[startup] INGEST_API_KEY is not set: IoT devices can only post with a logged-in session.")
    }
  }
}
