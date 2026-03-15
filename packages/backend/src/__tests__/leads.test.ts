import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createTestServer, type TestServer } from "./helpers/setup.js"
import { api } from "./helpers/http.js"
import { makeLeadInput, makeOutreachInput } from "./helpers/factories.js"

let server: TestServer
let baseUrl: string

beforeAll(async () => {
  server = await createTestServer()
  baseUrl = server.baseUrl
})

afterAll(async () => {
  await server.close()
})

describe("POST /api/leads", () => {
  it("creates a lead and returns 201", async () => {
    const input = makeLeadInput()
    const res = await api(baseUrl, "POST", "/api/leads", input)
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: input.name,
      email: input.email,
      stage: "new",
    })
    expect((res.body as Record<string, unknown>).id).toBeTypeOf("number")
  })

  it("defaults to stage 'new' when not specified", async () => {
    const input = makeLeadInput()
    const res = await api(baseUrl, "POST", "/api/leads", input)
    expect(res.status).toBe(201)
    expect((res.body as Record<string, unknown>).stage).toBe("new")
  })

  it("returns 400 for missing name", async () => {
    const res = await api(baseUrl, "POST", "/api/leads", { email: "a@b.com" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for missing email", async () => {
    const res = await api(baseUrl, "POST", "/api/leads", { name: "Test" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid email format", async () => {
    const res = await api(baseUrl, "POST", "/api/leads", {
      name: "Test",
      email: "not-an-email",
    })
    expect(res.status).toBe(400)
  })

  it("returns 409 for duplicate email", async () => {
    const input = makeLeadInput()
    await api(baseUrl, "POST", "/api/leads", input)
    const res = await api(baseUrl, "POST", "/api/leads", {
      ...makeLeadInput(),
      email: input.email,
    })
    expect(res.status).toBe(409)
  })
})

describe("GET /api/leads", () => {
  it("returns paginated result", async () => {
    const res = await api(baseUrl, "GET", "/api/leads")
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body).toHaveProperty("data")
    expect(body).toHaveProperty("total")
    expect(body).toHaveProperty("page")
    expect(body).toHaveProperty("limit")
    expect(Array.isArray(body.data)).toBe(true)
  })

  it("filters by stage", async () => {
    const input = makeLeadInput({ stage: "contacted" })
    await api(baseUrl, "POST", "/api/leads", input)
    const res = await api(baseUrl, "GET", "/api/leads?stage=contacted")
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    const data = body.data as Array<Record<string, unknown>>
    expect(data.every((l) => l.stage === "contacted")).toBe(true)
  })

  it("returns 400 for invalid stage filter", async () => {
    const res = await api(baseUrl, "GET", "/api/leads?stage=invalid")
    expect(res.status).toBe(400)
  })

  it("respects page and limit parameters", async () => {
    // Create enough leads for pagination
    for (let i = 0; i < 3; i++) {
      await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    }
    const res = await api(baseUrl, "GET", "/api/leads?page=1&limit=2")
    expect(res.status).toBe(200)
    const body = res.body as Record<string, unknown>
    expect(body.page).toBe(1)
    expect(body.limit).toBe(2)
    expect((body.data as unknown[]).length).toBeLessThanOrEqual(2)
  })
})

describe("GET /api/leads/:id", () => {
  it("returns lead by ID", async () => {
    const createRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const id = (createRes.body as Record<string, unknown>).id
    const res = await api(baseUrl, "GET", `/api/leads/${id}`)
    expect(res.status).toBe(200)
    expect((res.body as Record<string, unknown>).id).toBe(id)
  })

  it("returns 404 for non-existent ID", async () => {
    const res = await api(baseUrl, "GET", "/api/leads/99999")
    expect(res.status).toBe(404)
  })

  it("returns 400 for non-numeric ID", async () => {
    const res = await api(baseUrl, "GET", "/api/leads/abc")
    expect(res.status).toBe(400)
  })
})

describe("PATCH /api/leads/:id", () => {
  it("updates a single field", async () => {
    const createRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const id = (createRes.body as Record<string, unknown>).id
    const res = await api(baseUrl, "PATCH", `/api/leads/${id}`, {
      company: "NewCorp",
    })
    expect(res.status).toBe(200)
    expect((res.body as Record<string, unknown>).company).toBe("NewCorp")
  })

  it("returns 409 when updating email to existing one", async () => {
    const lead1 = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const lead2 = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const id2 = (lead2.body as Record<string, unknown>).id
    const email1 = (lead1.body as Record<string, unknown>).email

    const res = await api(baseUrl, "PATCH", `/api/leads/${id2}`, {
      email: email1,
    })
    expect(res.status).toBe(409)
  })

  it("returns 404 for non-existent ID", async () => {
    const res = await api(baseUrl, "PATCH", "/api/leads/99999", {
      company: "X",
    })
    expect(res.status).toBe(404)
  })
})

describe("DELETE /api/leads/:id", () => {
  it("deletes lead and returns 204", async () => {
    const createRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const id = (createRes.body as Record<string, unknown>).id
    const res = await api(baseUrl, "DELETE", `/api/leads/${id}`)
    expect(res.status).toBe(204)

    // Verify it's gone
    const getRes = await api(baseUrl, "GET", `/api/leads/${id}`)
    expect(getRes.status).toBe(404)
  })

  it("returns 404 for non-existent ID", async () => {
    const res = await api(baseUrl, "DELETE", "/api/leads/99999")
    expect(res.status).toBe(404)
  })

  it("cascades delete to outreach entries", async () => {
    const createRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const leadId = (createRes.body as Record<string, unknown>).id as number

    // Create outreach for this lead
    await api(baseUrl, "POST", "/api/outreach", makeOutreachInput(leadId))

    // Verify outreach exists
    const outreachBefore = await api(
      baseUrl,
      "GET",
      `/api/outreach?lead_id=${leadId}`
    )
    expect((outreachBefore.body as unknown[]).length).toBe(1)

    // Delete the lead
    await api(baseUrl, "DELETE", `/api/leads/${leadId}`)

    // Outreach should be gone (cascade)
    const outreachAfter = await api(
      baseUrl,
      "GET",
      `/api/outreach?lead_id=${leadId}`
    )
    expect((outreachAfter.body as unknown[]).length).toBe(0)
  })
})

describe("PATCH /api/leads/bulk/stage", () => {
  it("updates stage for multiple leads", async () => {
    const lead1 = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const lead2 = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const id1 = (lead1.body as Record<string, unknown>).id as number
    const id2 = (lead2.body as Record<string, unknown>).id as number

    const res = await api(baseUrl, "PATCH", "/api/leads/bulk/stage", {
      ids: [id1, id2],
      stage: "contacted",
    })
    expect(res.status).toBe(204)

    // Verify both updated
    const get1 = await api(baseUrl, "GET", `/api/leads/${id1}`)
    const get2 = await api(baseUrl, "GET", `/api/leads/${id2}`)
    expect((get1.body as Record<string, unknown>).stage).toBe("contacted")
    expect((get2.body as Record<string, unknown>).stage).toBe("contacted")
  })

  it("returns 400 for invalid stage", async () => {
    const res = await api(baseUrl, "PATCH", "/api/leads/bulk/stage", {
      ids: [1],
      stage: "invalid",
    })
    expect(res.status).toBe(400)
  })
})

describe("POST /api/leads/bulk/delete", () => {
  it("deletes multiple leads", async () => {
    const lead1 = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const lead2 = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const id1 = (lead1.body as Record<string, unknown>).id as number
    const id2 = (lead2.body as Record<string, unknown>).id as number

    const res = await api(baseUrl, "POST", "/api/leads/bulk/delete", {
      ids: [id1, id2],
    })
    expect(res.status).toBe(204)

    // Verify both gone
    const get1 = await api(baseUrl, "GET", `/api/leads/${id1}`)
    const get2 = await api(baseUrl, "GET", `/api/leads/${id2}`)
    expect(get1.status).toBe(404)
    expect(get2.status).toBe(404)
  })
})
