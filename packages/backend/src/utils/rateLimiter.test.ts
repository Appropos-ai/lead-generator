import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { isRateLimited, _resetForTest } from "./rateLimiter.js"

describe("isRateLimited", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    _resetForTest()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns false for the first request", () => {
    expect(isRateLimited("192.168.1.1")).toBe(false)
  })

  it("returns false at the 100th request", () => {
    for (let i = 0; i < 99; i++) {
      isRateLimited("192.168.1.1")
    }
    expect(isRateLimited("192.168.1.1")).toBe(false)
  })

  it("returns true at the 101st request", () => {
    for (let i = 0; i < 100; i++) {
      isRateLimited("192.168.1.1")
    }
    expect(isRateLimited("192.168.1.1")).toBe(true)
  })

  it("resets after 60 second window", () => {
    for (let i = 0; i < 100; i++) {
      isRateLimited("192.168.1.1")
    }
    expect(isRateLimited("192.168.1.1")).toBe(true)

    // Advance past the window
    vi.advanceTimersByTime(60_001)

    expect(isRateLimited("192.168.1.1")).toBe(false)
  })

  it("tracks IPs independently", () => {
    for (let i = 0; i < 100; i++) {
      isRateLimited("192.168.1.1")
    }
    expect(isRateLimited("192.168.1.1")).toBe(true)
    expect(isRateLimited("192.168.1.2")).toBe(false)
  })
})
