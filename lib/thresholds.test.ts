import { describe, expect, it } from "vitest"
import { evaluateThreshold } from "./thresholds"

describe("evaluateThreshold", () => {
  it("'>' : alert beats warning, strict comparison", () => {
    expect(evaluateThreshold(31, ">", 20, 30)).toBe("alert")
    expect(evaluateThreshold(30, ">", 20, 30)).toBe("warning") // equal to alert is not > alert
    expect(evaluateThreshold(25, ">", 20, 30)).toBe("warning")
    expect(evaluateThreshold(20, ">", 20, 30)).toBeNull()
  })

  it("'>=' includes the boundary", () => {
    expect(evaluateThreshold(150, ">=", 100, 150)).toBe("alert")
    expect(evaluateThreshold(100, ">=", 100, 150)).toBe("warning")
    expect(evaluateThreshold(99.9, ">=", 100, 150)).toBeNull()
  })

  it("'<' and '<=' work for low-side thresholds", () => {
    expect(evaluateThreshold(0.4, "<", 1, 0.5)).toBe("alert")
    expect(evaluateThreshold(0.8, "<", 1, 0.5)).toBe("warning")
    expect(evaluateThreshold(1, "<", 1, 0.5)).toBeNull()
    expect(evaluateThreshold(0.5, "<=", 1, 0.5)).toBe("alert")
  })

  it("treats 0 as a real value", () => {
    expect(evaluateThreshold(0, "<", 5, 1)).toBe("alert")
    expect(evaluateThreshold(0, ">", 20, 30)).toBeNull()
  })

  it("unknown operator never violates", () => {
    expect(evaluateThreshold(1000, "==", 1, 2)).toBeNull()
  })
})
