import { beforeEach, describe, expect, it } from "vitest"
import { clearFailures, LOGIN_WINDOW_MS, recordFailure, retryAfterSeconds } from "./rate-limit"

const KEY = "ipuser:1.1.1.1|admin"
const T0 = 1_000_000

describe("login rate limit", () => {
  beforeEach(() => clearFailures(KEY))

  it("allows attempts below the limit", () => {
    for (let i = 0; i < 4; i++) recordFailure(KEY, T0 + i)
    expect(retryAfterSeconds(KEY, 5, T0 + 10)).toBe(0)
  })

  it("blocks once the limit is reached and reports the wait", () => {
    for (let i = 0; i < 5; i++) recordFailure(KEY, T0)
    const wait = retryAfterSeconds(KEY, 5, T0 + 60_000)
    expect(wait).toBeGreaterThan(0)
    expect(wait).toBeLessThanOrEqual(LOGIN_WINDOW_MS / 1000)
  })

  it("unblocks after the window passes", () => {
    for (let i = 0; i < 5; i++) recordFailure(KEY, T0)
    expect(retryAfterSeconds(KEY, 5, T0 + LOGIN_WINDOW_MS + 1)).toBe(0)
  })

  it("clearFailures resets the counter", () => {
    for (let i = 0; i < 5; i++) recordFailure(KEY, T0)
    clearFailures(KEY)
    expect(retryAfterSeconds(KEY, 5, T0 + 1)).toBe(0)
  })

  it("keys are independent", () => {
    for (let i = 0; i < 5; i++) recordFailure(KEY, T0)
    expect(retryAfterSeconds("ipuser:2.2.2.2|admin", 5, T0 + 1)).toBe(0)
  })
})
