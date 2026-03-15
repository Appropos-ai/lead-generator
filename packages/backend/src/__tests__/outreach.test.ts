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

describe("POST /api/outreach", () => {
  it("creates entry for existing lead, returns 201", async () => {
    const leadRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const leadId = (leadRes.body as Record<string, unknown>).id as number

    const res = await api(
      baseUrl,
      "POST",
      "/api/outreach",
      makeOutreachInput(leadId)
    )
    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      lead_id: leadId,
      channel: "email",
      status: "sent",
    })
  })

  it("returns 422 for non-existent lead_id", async () => {
    const res = await api(
      baseUrl,
      "POST",
      "/api/outreach",
      makeOutreachInput(99999)
    )
    expect(res.status).toBe(422)
  })

  it("returns 400 for invalid channel", async () => {
    const leadRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const leadId = (leadRes.body as Record<string, unknown>).id as number

    const res = await api(
      baseUrl,
      "POST",
      "/api/outreach",
      makeOutreachInput(leadId, { channel: "phone" })
    )
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid status", async () => {
    const leadRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const leadId = (leadRes.body as Record<string, unknown>).id as number

    const res = await api(
      baseUrl,
      "POST",
      "/api/outreach",
      makeOutreachInput(leadId, { status: "failed" })
    )
    expect(res.status).toBe(400)
  })
})

describe("GET /api/outreach", () => {
  it("returns entries for a lead ordered by date DESC", async () => {
    const leadRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const leadId = (leadRes.body as Record<string, unknown>).id as number

    await api(
      baseUrl,
      "POST",
      "/api/outreach",
      makeOutreachInput(leadId, { date: "2025-01-01" })
    )
    await api(
      baseUrl,
      "POST",
      "/api/outreach",
      makeOutreachInput(leadId, { date: "2025-06-01" })
    )

    const res = await api(baseUrl, "GET", `/api/outreach?lead_id=${leadId}`)
    expect(res.status).toBe(200)
    const data = res.body as Array<Record<string, unknown>>
    expect(data.length).toBe(2)
    expect(data[0].date).toBe("2025-06-01")
    expect(data[1].date).toBe("2025-01-01")
  })

  it("returns empty array for lead with no entries", async () => {
    const leadRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const leadId = (leadRes.body as Record<string, unknown>).id as number

    const res = await api(baseUrl, "GET", `/api/outreach?lead_id=${leadId}`)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it("returns 400 when lead_id is missing", async () => {
    const res = await api(baseUrl, "GET", "/api/outreach")
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/outreach/:id", () => {
  it("deletes entry and returns 204", async () => {
    const leadRes = await api(baseUrl, "POST", "/api/leads", makeLeadInput())
    const leadId = (leadRes.body as Record<string, unknown>).id as number

    const createRes = await api(
      baseUrl,
      "POST",
      "/api/outreach",
      makeOutreachInput(leadId)
    )
    const entryId = (createRes.body as Record<string, unknown>).id as number

    const res = await api(baseUrl, "DELETE", `/api/outreach/${entryId}`)
    expect(res.status).toBe(204)
  })

  it("returns 404 for non-existent ID", async () => {
    const res = await api(baseUrl, "DELETE", "/api/outreach/99999")
    expect(res.status).toBe(404)
  })
})
