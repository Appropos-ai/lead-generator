import { describe, it, expect } from "vitest"
import { Schema } from "effect"
import { PluginMetadata, PluginRunStatus, PluginRun, ScrapedLead } from "./Plugin.js"

const decode = <A, I>(schema: Schema.Schema<A, I>) =>
  (input: unknown) => Schema.decodeUnknownEither(schema)(input)

describe("PluginMetadata", () => {
  const parse = decode(PluginMetadata)

  it("accepts valid metadata", () => {
    const result = parse({ name: "test-plugin", description: "A test plugin", version: "1.0.0" })
    expect(result._tag).toBe("Right")
  })

  it("rejects missing name", () => {
    expect(parse({ description: "desc", version: "1.0.0" })._tag).toBe("Left")
  })

  it("rejects missing description", () => {
    expect(parse({ name: "test", version: "1.0.0" })._tag).toBe("Left")
  })

  it("rejects missing version", () => {
    expect(parse({ name: "test", description: "desc" })._tag).toBe("Left")
  })
})

describe("PluginRunStatus", () => {
  const parse = decode(PluginRunStatus)

  it.each(["running", "completed", "failed"])("accepts '%s'", (s) => {
    expect(parse(s)._tag).toBe("Right")
  })

  it("rejects invalid status", () => {
    expect(parse("pending")._tag).toBe("Left")
  })
})

describe("PluginRun", () => {
  const parse = decode(PluginRun)

  const validRun = {
    id: 1,
    plugin_name: "test-plugin",
    started_at: "2024-01-15T10:00:00",
    completed_at: "2024-01-15T10:01:00",
    status: "completed",
    leads_found: 5,
    leads_added: 3,
    error_message: null,
  }

  it("accepts valid completed run", () => {
    expect(parse(validRun)._tag).toBe("Right")
  })

  it("accepts running status with null completed_at", () => {
    expect(parse({ ...validRun, status: "running", completed_at: null })._tag).toBe("Right")
  })

  it("accepts failed run with error_message", () => {
    expect(parse({ ...validRun, status: "failed", error_message: "timeout" })._tag).toBe("Right")
  })

  it("rejects missing plugin_name", () => {
    const { plugin_name, ...rest } = validRun
    expect(parse(rest)._tag).toBe("Left")
  })
})

describe("ScrapedLead", () => {
  const parse = decode(ScrapedLead)

  it("accepts valid full scraped lead", () => {
    const result = parse({
      name: "Alice",
      email: "alice@example.com",
      linkedin_url: "https://linkedin.com/in/alice",
      company: "Acme",
      title: "CEO",
      notes: "Scraped from web",
    })
    expect(result._tag).toBe("Right")
  })

  it("accepts minimal scraped lead (name + email)", () => {
    expect(parse({ name: "Bob", email: "bob@example.com" })._tag).toBe("Right")
  })

  it("rejects missing name", () => {
    expect(parse({ email: "bob@example.com" })._tag).toBe("Left")
  })

  it("rejects missing email", () => {
    expect(parse({ name: "Bob" })._tag).toBe("Left")
  })

  it("accepts null optional fields", () => {
    const result = parse({
      name: "Bob",
      email: "bob@example.com",
      linkedin_url: null,
      company: null,
      title: null,
      notes: null,
    })
    expect(result._tag).toBe("Right")
  })
})
