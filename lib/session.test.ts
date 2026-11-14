import { afterEach, describe, expect, it, vi } from "vitest"
import { getAuthSecret, roleAtLeast, signSession, verifySessionToken } from "./session"

afterEach(() => vi.unstubAllEnvs())

describe("getAuthSecret", () => {
  it("production rejects missing, placeholder and short secrets", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_SECRET", "")
    expect(() => getAuthSecret()).toThrow(/AUTH_SECRET/)
    vi.stubEnv("AUTH_SECRET", "change-me-please-set-a-long-random-secret")
    expect(() => getAuthSecret()).toThrow(/AUTH_SECRET/)
    vi.stubEnv("AUTH_SECRET", "too-short")
    expect(() => getAuthSecret()).toThrow(/AUTH_SECRET/)
  })

  it("production accepts a long random secret", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("AUTH_SECRET", "x".repeat(40))
    expect(() => getAuthSecret()).not.toThrow()
  })

  it("development falls back to a dev secret", () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("AUTH_SECRET", "")
    expect(() => getAuthSecret()).not.toThrow()
  })
})

describe("session tokens", () => {
  it("round-trips role and the forced-password-change flag", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const token = await signSession({ id: 7, username: "u", role: "operator" }, { mustChangePassword: true })
    const payload = await verifySessionToken(token)
    expect(payload).toMatchObject({ sub: "7", username: "u", role: "operator", pwd_change: true })
  })

  it("rejects a token signed with another secret", async () => {
    vi.stubEnv("NODE_ENV", "development")
    vi.stubEnv("AUTH_SECRET", "a".repeat(40))
    const token = await signSession({ id: 1, username: "u", role: "admin" })
    vi.stubEnv("AUTH_SECRET", "b".repeat(40))
    expect(await verifySessionToken(token)).toBeNull()
  })

  it("roleAtLeast orders viewer < operator < admin and rejects junk", () => {
    expect(roleAtLeast("admin", "operator")).toBe(true)
    expect(roleAtLeast("viewer", "operator")).toBe(false)
    expect(roleAtLeast(undefined, "viewer")).toBe(false)
    expect(roleAtLeast("root" as any, "viewer")).toBe(false)
  })
})
