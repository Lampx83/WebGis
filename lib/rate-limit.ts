// In-memory sliding-window limiter for login attempts.
//
// Per-process only: with several web replicas each one keeps its own counters,
// so the effective limit is (limit x replicas). That is fine for the current
// single-container deployment; move to Redis/Postgres if it is ever scaled out.

interface Bucket {
  hits: number[] // timestamps (ms) of recent failures
}

const globalForRl = globalThis as unknown as { __loginBuckets?: Map<string, Bucket> }
const buckets = (globalForRl.__loginBuckets ??= new Map<string, Bucket>())

export const LOGIN_WINDOW_MS = 15 * 60 * 1000

function prune(b: Bucket, now: number) {
  b.hits = b.hits.filter((t) => now - t < LOGIN_WINDOW_MS)
}

/** Seconds the caller must wait, or 0 when the key is under `limit` failures. */
export function retryAfterSeconds(key: string, limit: number, now = Date.now()): number {
  const b = buckets.get(key)
  if (!b) return 0
  prune(b, now)
  if (b.hits.length < limit) return 0
  const oldest = b.hits[b.hits.length - limit]
  return Math.max(1, Math.ceil((oldest + LOGIN_WINDOW_MS - now) / 1000))
}

export function recordFailure(key: string, now = Date.now()) {
  const b = buckets.get(key) ?? { hits: [] }
  prune(b, now)
  b.hits.push(now)
  buckets.set(key, b)

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      prune(v, now)
      if (v.hits.length === 0) buckets.delete(k)
    }
  }
}

export function clearFailures(key: string) {
  buckets.delete(key)
}
