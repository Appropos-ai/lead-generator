import { describe, it, expect } from "vitest"
import { isSafeUrl } from "./url.js"

describe("isSafeUrl", () => {
  it("accepts http URLs", () => {
    expect(isSafeUrl("http://example.com")).toBe(true)
  })

  it("accepts https URLs", () => {
    expect(isSafeUrl("https://linkedin.com/in/alice")).toBe(true)
  })

  it("accepts HTTPS with mixed case", () => {
    expect(isSafeUrl("HTTPS://EXAMPLE.COM")).toBe(true)
  })

  it("rejects javascript: protocol", () => {
    expect(isSafeUrl("javascript:alert(1)")).toBe(false)
  })

  it("rejects data: protocol", () => {
    expect(isSafeUrl("data:text/html,<h1>hi</h1>")).toBe(false)
  })

  it("rejects empty string", () => {
    expect(isSafeUrl("")).toBe(false)
  })

  it("rejects plain text", () => {
    expect(isSafeUrl("not a url")).toBe(false)
  })
})
