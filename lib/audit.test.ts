import { describe, expect, it, vi } from "vitest"
import { recordAudit, DEVICE_FIELDS, USER_FIELDS, diffRecords, parsePaging, planUserUpdateAudit, summarize } from "./audit"

describe("summarize", () => {
  it("keeps only whitelisted fields and never secrets", () => {
    const row = { id: 1, username: "bob", role: "admin", password_hash: "$2b$xx", api_key: "k", token_version: 3 }
    expect(summarize(row, ["username", "role", "password_hash", "api_key", "token_version"])).toEqual({
      username: "bob",
      role: "admin",
    })
  })

  it("truncates very long strings", () => {
    const out = summarize({ name: "x".repeat(2000) }, ["name"])
    expect((out.name as string).length).toBeLessThan(600)
  })

  it("handles null rows", () => {
    expect(summarize(null, USER_FIELDS)).toEqual({})
  })
})

describe("diffRecords", () => {
  it("returns only changed fields", () => {
    const d = diffRecords({ name: "A", type: "camera", latitude: 1 }, { name: "B", type: "camera", latitude: 1 }, DEVICE_FIELDS)
    expect(d).toEqual({ before: { name: "A" }, after: { name: "B" } })
  })

  it("returns null when nothing changed", () => {
    expect(diffRecords({ name: "A" }, { name: "A", updated_at: "now" }, DEVICE_FIELDS)).toBeNull()
  })

  it("treats null and missing as equal", () => {
    expect(diffRecords({ description: null }, {}, ["description"])).toBeNull()
  })
})

describe("planUserUpdateAudit", () => {
  const before = { id: 2, username: "u", email: "a@x", full_name: "U", role: "viewer", is_active: true }

  it("logs a role change separately and nothing else when only the role changed", () => {
    const rows = planUserUpdateAudit(2, before, { ...before, role: "admin" }, false)
    expect(rows.map((r) => r.action)).toEqual(["user.role_change"])
    expect(rows[0].changes).toEqual({ before: { role: "viewer" }, after: { role: "admin" } })
  })

  it("logs a password reset without any trace of the password", () => {
    const rows = planUserUpdateAudit(2, before, before, true)
    expect(rows.map((r) => r.action)).toEqual(["user.password_reset"])
    expect(JSON.stringify(rows)).not.toMatch(/hash|\$2b/)
  })

  it("logs plain field edits as user.update and records deactivation", () => {
    const rows = planUserUpdateAudit(2, before, { ...before, is_active: false, full_name: "V" }, false)
    expect(rows.map((r) => r.action)).toEqual(["user.update"])
    expect(rows[0].changes).toEqual({
      before: { full_name: "U", is_active: true },
      after: { full_name: "V", is_active: false },
    })
  })

  it("logs nothing for a no-op save", () => {
    expect(planUserUpdateAudit(2, before, { ...before }, false)).toEqual([])
  })
})

describe("parsePaging", () => {
  const p = (q: string) => parsePaging(new URLSearchParams(q))
  it("defaults", () => expect(p("")).toEqual({ page: 1, pageSize: 25, offset: 0 }))
  it("computes offset", () => expect(p("page=3&page_size=10")).toEqual({ page: 3, pageSize: 10, offset: 20 }))
  it("clamps bad input", () => {
    expect(p("page=-4&page_size=100000")).toEqual({ page: 1, pageSize: 100, offset: 0 })
    expect(p("page=abc&page_size=0")).toEqual({ page: 1, pageSize: 1, offset: 0 })
  })
})

describe("recordAudit", () => {
  it("never records machine-key or anonymous requests as admin actions", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://never-contacted@127.0.0.1:1/none")
    // would throw/log if it tried to reach the database
    await expect(recordAudit({ kind: "ingest_key" }, { action: "x", resource_type: "device" })).resolves.toBeUndefined()
    await expect(recordAudit({ kind: "anonymous" }, { action: "x", resource_type: "device" })).resolves.toBeUndefined()
    vi.unstubAllEnvs()
  })
})
