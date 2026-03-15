import { describe, it, expect } from "vitest"
import { Schema } from "effect"
import { OutreachChannel, OutreachStatus, CreateOutreachInput } from "./Outreach.js"

const decode = <A, I>(schema: Schema.Schema<A, I>) =>
  (input: unknown) => Schema.decodeUnknownEither(schema)(input)

describe("OutreachChannel", () => {
  const parse = decode(OutreachChannel)

  it.each(["email", "linkedin"])("accepts valid channel '%s'", (ch) => {
    expect(parse(ch)._tag).toBe("Right")
  })

  it("rejects invalid channel", () => {
    expect(parse("phone")._tag).toBe("Left")
  })

  it("rejects empty string", () => {
    expect(parse("")._tag).toBe("Left")
  })
})

describe("OutreachStatus", () => {
  const parse = decode(OutreachStatus)

  it.each(["sent", "replied", "bounced"])("accepts valid status '%s'", (s) => {
    expect(parse(s)._tag).toBe("Right")
  })

  it("rejects invalid status", () => {
    expect(parse("pending")._tag).toBe("Left")
  })
})

describe("CreateOutreachInput", () => {
  const parse = decode(CreateOutreachInput)

  it("accepts valid full input", () => {
    const result = parse({
      lead_id: 1,
      date: "2024-01-15",
      channel: "email",
      status: "sent",
      notes: "Sent intro email",
    })
    expect(result._tag).toBe("Right")
  })

  it("accepts input without notes", () => {
    const result = parse({
      lead_id: 1,
      date: "2024-01-15",
      channel: "linkedin",
      status: "replied",
    })
    expect(result._tag).toBe("Right")
  })

  it("rejects missing lead_id", () => {
    const result = parse({
      date: "2024-01-15",
      channel: "email",
      status: "sent",
    })
    expect(result._tag).toBe("Left")
  })

  it("rejects missing date", () => {
    const result = parse({
      lead_id: 1,
      channel: "email",
      status: "sent",
    })
    expect(result._tag).toBe("Left")
  })

  it("rejects invalid channel", () => {
    const result = parse({
      lead_id: 1,
      date: "2024-01-15",
      channel: "phone",
      status: "sent",
    })
    expect(result._tag).toBe("Left")
  })

  it("rejects invalid status", () => {
    const result = parse({
      lead_id: 1,
      date: "2024-01-15",
      channel: "email",
      status: "delivered",
    })
    expect(result._tag).toBe("Left")
  })

  it("accepts null notes", () => {
    const result = parse({
      lead_id: 1,
      date: "2024-01-15",
      channel: "email",
      status: "sent",
      notes: null,
    })
    expect(result._tag).toBe("Right")
  })
})
