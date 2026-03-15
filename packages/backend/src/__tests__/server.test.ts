import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createTestServer, type TestServer } from "./helpers/setup.js"
import { api, rawFetch } from "./helpers/http.js"
import { _resetForTest as resetRateLimiter } from "../utils/rateLimiter.js"

let server: TestServer
let baseUrl: string

beforeAll(async () => {
  server = await createTestServer()
  baseUrl = server.baseUrl
})

afterAll(async () => {
  await server.close()
})

describe("CORS", () => {
  it("OPTIONS returns 204 with CORS headers", async () => {
    const res = await fetch(`${baseUrl}/api/leads`, { method: "OPTIONS" })
    expect(res.status).toBe(204)
    expect(res.headers.get("access-control-allow-origin")).toBeTruthy()
  })
})

describe("404", () => {
  it("unknown route returns 404 with error message", async () => {
    const res = await api(baseUrl, "GET", "/api/nonexistent")
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: "Not found" })
  })
})

describe("Content-Type validation", () => {
  it("POST with text/plain returns 415", async () => {
    const res = await rawFetch(baseUrl, "POST", "/api/leads", "not json", "text/plain")
    expect(res.status).toBe(415)
  })
})

describe("Malformed JSON", () => {
  it("POST with invalid JSON returns 400", async () => {
    const res = await rawFetch(baseUrl, "POST", "/api/leads", "{invalid json", "application/json")
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: "Malformed JSON body" })
  })
})

describe("Security headers", () => {
  it("includes X-Content-Type-Options and X-Frame-Options", async () => {
    const res = await api(baseUrl, "GET", "/api/leads")
    expect(res.headers.get("x-content-type-options")).toBe("nosniff")
    expect(res.headers.get("x-frame-options")).toBe("DENY")
  })
})

describe("Rate limiting", () => {
  beforeAll(() => {
    resetRateLimiter()
  })

  it("101st request returns 429", async () => {
    // Fire 100 requests to exhaust the limit
    const promises = []
    for (let i = 0; i < 100; i++) {
      promises.push(fetch(`${baseUrl}/api/leads`))
    }
    await Promise.all(promises)

    // 101st should be rate limited
    const res = await api(baseUrl, "GET", "/api/leads")
    expect(res.status).toBe(429)
    expect(res.body).toEqual({ error: "Too many requests" })
  })
})
