import { describe, expect, it } from "vitest"
import { evaluateSession, isMissingColumn, type LiveUser } from "./session-check"

const live = (over: Partial<LiveUser> = {}): LiveUser => ({
  id: 5,
  username: "u",
  role: "operator",
  is_active: true,
  token_version: 2,
  ...over,
})

describe("evaluateSession", () => {
  it("accepts a token whose version matches", () => {
    expect(evaluateSession({ tv: 2 }, live())).toEqual({ ok: true, role: "operator" })
  })

  it("uses the role from the database, not the token", () => {
    expect(evaluateSession({ tv: 2 }, live({ role: "viewer" }))).toEqual({ ok: true, role: "viewer" })
  })

  it("rejects deleted and deactivated users", () => {
    expect(evaluateSession({ tv: 2 }, null)).toEqual({ ok: false, reason: "user_missing" })
    expect(evaluateSession({ tv: 2 }, live({ is_active: false }))).toEqual({ ok: false, reason: "inactive" })
  })

  it("rejects a token issued before a version bump", () => {
    expect(evaluateSession({ tv: 1 }, live())).toEqual({ ok: false, reason: "token_revoked" })
  })

  it("treats a token without tv as version 0", () => {
    expect(evaluateSession({}, live({ token_version: 0 }))).toEqual({ ok: true, role: "operator" })
    expect(evaluateSession({}, live({ token_version: 1 }))).toEqual({ ok: false, reason: "token_revoked" })
  })

  it("skips the version check on a database that has no token_version column yet", () => {
    expect(evaluateSession({ tv: 7 }, live({ token_version: null }))).toEqual({ ok: true, role: "operator" })
    // …but deactivation is still enforced
    expect(evaluateSession({}, live({ token_version: null, is_active: false })).ok).toBe(false)
  })

  it("rejects an unknown role value", () => {
    expect(evaluateSession({ tv: 2 }, live({ role: "root" as any })).ok).toBe(false)
  })
})

describe("isMissingColumn", () => {
  it("recognises Postgres undefined_column only", () => {
    expect(isMissingColumn({ code: "42703" })).toBe(true)
    expect(isMissingColumn({ code: "42P01" })).toBe(false)
    expect(isMissingColumn(null)).toBe(false)
  })
})
