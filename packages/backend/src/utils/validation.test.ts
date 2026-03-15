import { describe, it, expect } from "vitest"
import { Effect } from "effect"
import { parseIntParam } from "./validation.js"

describe("parseIntParam", () => {
  it("parses valid integer '1'", async () => {
    const result = await Effect.runPromise(parseIntParam("1", "page"))
    expect(result).toBe(1)
  })

  it("parses valid integer '42'", async () => {
    const result = await Effect.runPromise(parseIntParam("42", "page"))
    expect(result).toBe(42)
  })

  it("rejects '0'", async () => {
    const result = await Effect.runPromise(Effect.either(parseIntParam("0", "page")))
    expect(result._tag).toBe("Left")
  })

  it("rejects negative numbers", async () => {
    const result = await Effect.runPromise(Effect.either(parseIntParam("-1", "page")))
    expect(result._tag).toBe("Left")
  })

  it("rejects decimal numbers", async () => {
    const result = await Effect.runPromise(Effect.either(parseIntParam("1.5", "page")))
    expect(result._tag).toBe("Left")
  })

  it("rejects non-numeric strings", async () => {
    const result = await Effect.runPromise(Effect.either(parseIntParam("abc", "page")))
    expect(result._tag).toBe("Left")
  })

  it("rejects empty string", async () => {
    const result = await Effect.runPromise(Effect.either(parseIntParam("", "page")))
    expect(result._tag).toBe("Left")
  })

  it("includes param name in error message", async () => {
    const result = await Effect.runPromise(Effect.either(parseIntParam("abc", "limit")))
    expect(result._tag).toBe("Left")
    if (result._tag === "Left") {
      expect(result.left.message).toContain("limit")
    }
  })
})
