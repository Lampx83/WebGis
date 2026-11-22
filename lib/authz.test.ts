import { afterEach, describe, expect, it, vi } from "vitest"
import { authorize, readCookie } from "./authz"
import { COOKIE_NAME, signSession } from "./session"

afterEach(() => vi.unstubAllEnvs())

describe("readCookie", () => {
  it("finds a cookie among several", () => {
    expect(readCookie("a=1; webgis_session=tok.en.x; b=2", "webgis_session")).toBe("tok.en.x")
  })
  it("returns undefined when absent or header empty", () => {
    expect(readCookie("a=1", "webgis_session")).toBeUndefined()
    expect(readCookie(null, "webgis_session")).toBeUndefined()
  })
  it("does not match on a name suffix", () => {
    expect(readCookie("x_webgis_session=bad", "webgis_session")).toBeUndefined()
  })
})

// Mock mode (no DATABASE_URL): authorize trusts the verified JWT, so these run without a database.
describe("authorize (mock mode)", () => {
  const req = (method: string, path: string, headers: Record<string, string> = {}) =>
    new Request(`http://localhost${path}`, { method, headers })

  it("lets public GETs through without any session", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const r = await authorize(req("GET", "/api/devices"))
    expect(r).toEqual({ ok: true, actor: { kind: "anonymous" } })
  })

  it("401s a write without a session", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const r = await authorize(req("POST", "/api/devices"))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(401)
  })

  it("accepts the ingest key for ingest routes only, as a non-user actor", async () => {
    vi.stubEnv("DATABASE_URL", "")
    vi.stubEnv("INGEST_API_KEY", "k".repeat(20))
    const ok = await authorize(req("POST", "/api/devices/1/readings", { "x-api-key": "k".repeat(20) }))
    expect(ok).toEqual({ ok: true, actor: { kind: "ingest_key" } })
    const no = await authorize(req("POST", "/api/devices", { "x-api-key": "k".repeat(20) }))
    expect(no.ok).toBe(false)
  })

  it("enforces the role from the policy", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const viewer = await signSession({ id: 3, username: "v", role: "viewer" })
    const r = await authorize(req("POST", "/api/devices", { cookie: `${COOKIE_NAME}=${viewer}` }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.response.status).toBe(403)

    const admin = await signSession({ id: 1, username: "a", role: "admin" })
    const ok = await authorize(req("GET", "/api/users", { cookie: `${COOKIE_NAME}=${admin}` }))
    expect(ok).toEqual({ ok: true, actor: { kind: "user", id: 1, username: "a", role: "admin" } })
  })

  it("blocks sessions that still must change the default password", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const t = await signSession({ id: 1, username: "a", role: "admin" }, { mustChangePassword: true })
    const r = await authorize(req("POST", "/api/devices", { cookie: `${COOKIE_NAME}=${t}` }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect((await r.response.json()).code).toBe("PASSWORD_CHANGE_REQUIRED")
  })
})
