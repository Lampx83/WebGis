import { describe, expect, it } from "vitest"
import { hasValidIngestKey, ruleFor } from "./access-policy"

const KEY = "0123456789abcdef0123"
const h = (init: Record<string, string>) => ({ get: (k: string) => init[k.toLowerCase()] ?? null })

describe("ruleFor", () => {
  it("keeps dashboard reads public", () => {
    for (const p of ["/api/devices", "/api/alerts", "/api/monitoring-status", "/api/devices/with-alerts", "/api/devices/3/readings"]) {
      expect(ruleFor(p, "GET")).toEqual({ kind: "public" })
    }
  })

  it("requires a login to read raw logs and analytics", () => {
    expect(ruleFor("/api/logging/iot", "GET")).toEqual({ kind: "role", role: "viewer" })
    expect(ruleFor("/api/analytics/api-usage", "GET")).toEqual({ kind: "role", role: "viewer" })
  })

  it("users and admin APIs are admin-only for every method", () => {
    for (const m of ["GET", "POST", "PUT", "DELETE"]) {
      expect(ruleFor("/api/users", m)).toEqual({ kind: "role", role: "admin" })
      expect(ruleFor("/api/users/3", m)).toEqual({ kind: "role", role: "admin" })
    }
  })

  it("destructive operations need admin", () => {
    expect(ruleFor("/api/devices/3", "DELETE")).toEqual({ kind: "role", role: "admin" })
    expect(ruleFor("/api/data-retention/cleanup", "POST")).toEqual({ kind: "role", role: "admin" })
  })

  it("configuration writes need operator, never the ingest key", () => {
    expect(ruleFor("/api/thresholds", "POST")).toEqual({ kind: "role", role: "operator" })
    expect(ruleFor("/api/thresholds/4", "PUT")).toEqual({ kind: "role", role: "operator" })
    expect(ruleFor("/api/thresholds/4", "DELETE")).toEqual({ kind: "role", role: "operator" })
    expect(ruleFor("/api/devices", "POST")).toEqual({ kind: "role", role: "operator" })
    expect(ruleFor("/api/devices/3", "PUT")).toEqual({ kind: "role", role: "operator" })
  })

  it("device data ingest accepts the machine key", () => {
    for (const p of ["/api/devices/3/readings", "/api/devices/3/events", "/api/security/detections", "/api/logging/iot", "/api/alerts", "/api/analytics/api-usage"]) {
      expect(ruleFor(p, "POST")).toEqual({ kind: "ingest" })
    }
  })

  it("read-only threshold checks stay public; auth endpoints are open", () => {
    expect(ruleFor("/api/thresholds/check", "POST")).toEqual({ kind: "public" })
    expect(ruleFor("/api/thresholds/check-window", "POST")).toEqual({ kind: "public" })
    expect(ruleFor("/api/auth/login", "POST")).toEqual({ kind: "public" })
  })

  it("any unknown write defaults to operator", () => {
    expect(ruleFor("/api/something-new", "POST")).toEqual({ kind: "role", role: "operator" })
  })
})

describe("hasValidIngestKey", () => {
  it("accepts x-api-key and Bearer, rejects wrong or missing", () => {
    expect(hasValidIngestKey(h({ "x-api-key": KEY }), KEY)).toBe(true)
    expect(hasValidIngestKey(h({ authorization: `Bearer ${KEY}` }), KEY)).toBe(true)
    expect(hasValidIngestKey(h({ "x-api-key": KEY + "x" }), KEY)).toBe(false)
    expect(hasValidIngestKey(h({}), KEY)).toBe(false)
  })

  it("is disabled when no (or a too short) key is configured", () => {
    expect(hasValidIngestKey(h({ "x-api-key": "short" }), "short")).toBe(false)
    expect(hasValidIngestKey(h({ "x-api-key": "anything" }), undefined)).toBe(false)
  })
})
