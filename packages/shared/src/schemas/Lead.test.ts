import { describe, it, expect } from "vitest"
import { Schema } from "effect"
import { PipelineStage, CreateLeadInput, UpdateLeadInput, BulkStageInput, BulkDeleteInput } from "./Lead.js"

const decode =
  <A, I>(schema: Schema.Schema<A, I>) =>
  (input: unknown) =>
    Schema.decodeUnknownEither(schema)(input)

describe("PipelineStage", () => {
  const parse = decode(PipelineStage)

  it.each(["new", "contacted", "responded", "converted", "lost"])("accepts valid stage '%s'", (stage) => {
    const result = parse(stage)
    expect(result._tag).toBe("Right")
  })

  it("rejects invalid stage", () => {
    const result = parse("invalid")
    expect(result._tag).toBe("Left")
  })

  it("rejects empty string", () => {
    const result = parse("")
    expect(result._tag).toBe("Left")
  })
})

describe("CreateLeadInput", () => {
  const parse = decode(CreateLeadInput)

  it("accepts valid full input", () => {
    const result = parse({
      name: "Alice",
      email: "alice@example.com",
      linkedin_url: "https://linkedin.com/in/alice",
      company: "Acme",
      title: "CEO",
      source: "web",
      notes: "Met at conference",
      stage: "contacted",
    })
    expect(result._tag).toBe("Right")
  })

  it("accepts minimal input (name + email only)", () => {
    const result = parse({ name: "Bob", email: "bob@example.com" })
    expect(result._tag).toBe("Right")
  })

  it("rejects missing name", () => {
    const result = parse({ email: "bob@example.com" })
    expect(result._tag).toBe("Left")
  })

  it("rejects missing email", () => {
    const result = parse({ name: "Bob" })
    expect(result._tag).toBe("Left")
  })

  it("rejects email without @", () => {
    const result = parse({ name: "Bob", email: "notanemail" })
    expect(result._tag).toBe("Left")
  })

  it("rejects email with spaces", () => {
    const result = parse({ name: "Bob", email: "has space@example.com" })
    expect(result._tag).toBe("Left")
  })

  it("rejects name exceeding 255 characters", () => {
    const result = parse({ name: "a".repeat(256), email: "a@b.com" })
    expect(result._tag).toBe("Left")
  })

  it("rejects linkedin_url exceeding 2048 characters", () => {
    const result = parse({
      name: "Bob",
      email: "bob@example.com",
      linkedin_url: "https://linkedin.com/" + "x".repeat(2048),
    })
    expect(result._tag).toBe("Left")
  })

  it("rejects notes exceeding 10000 characters", () => {
    const result = parse({
      name: "Bob",
      email: "bob@example.com",
      notes: "x".repeat(10001),
    })
    expect(result._tag).toBe("Left")
  })

  it("accepts null for optional nullable fields", () => {
    const result = parse({
      name: "Bob",
      email: "bob@example.com",
      linkedin_url: null,
      company: null,
      title: null,
      source: null,
      notes: null,
    })
    expect(result._tag).toBe("Right")
  })

  it("leaves stage undefined when omitted", () => {
    const result = parse({ name: "Bob", email: "bob@example.com" })
    expect(result._tag).toBe("Right")
    if (result._tag === "Right") {
      expect(result.right.stage).toBeUndefined()
    }
  })

  it("rejects invalid stage", () => {
    const result = parse({ name: "Bob", email: "bob@example.com", stage: "invalid" })
    expect(result._tag).toBe("Left")
  })
})

describe("UpdateLeadInput", () => {
  const parse = decode(UpdateLeadInput)

  it("accepts partial update", () => {
    const result = parse({ name: "New Name" })
    expect(result._tag).toBe("Right")
  })

  it("accepts empty object", () => {
    const result = parse({})
    expect(result._tag).toBe("Right")
  })

  it("rejects invalid email when provided", () => {
    const result = parse({ email: "notvalid" })
    expect(result._tag).toBe("Left")
  })

  it("accepts valid email update", () => {
    const result = parse({ email: "new@example.com" })
    expect(result._tag).toBe("Right")
  })
})

describe("BulkStageInput", () => {
  const parse = decode(BulkStageInput)

  it("accepts valid array of ids with stage", () => {
    const result = parse({ ids: [1, 2, 3], stage: "contacted" })
    expect(result._tag).toBe("Right")
  })

  it("rejects more than 500 items", () => {
    const ids = Array.from({ length: 501 }, (_, i) => i + 1)
    const result = parse({ ids, stage: "contacted" })
    expect(result._tag).toBe("Left")
  })

  it("accepts exactly 500 items", () => {
    const ids = Array.from({ length: 500 }, (_, i) => i + 1)
    const result = parse({ ids, stage: "new" })
    expect(result._tag).toBe("Right")
  })

  it("rejects missing stage", () => {
    const result = parse({ ids: [1, 2] })
    expect(result._tag).toBe("Left")
  })
})

describe("BulkDeleteInput", () => {
  const parse = decode(BulkDeleteInput)

  it("accepts valid array of ids", () => {
    const result = parse({ ids: [1, 2, 3] })
    expect(result._tag).toBe("Right")
  })

  it("rejects more than 500 items", () => {
    const ids = Array.from({ length: 501 }, (_, i) => i + 1)
    const result = parse({ ids })
    expect(result._tag).toBe("Left")
  })

  it("accepts empty array", () => {
    const result = parse({ ids: [] })
    expect(result._tag).toBe("Right")
  })
})
