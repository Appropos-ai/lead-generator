import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { createTestServer, type TestServer } from "./helpers/setup.js"
import { api } from "./helpers/http.js"

let server: TestServer
let baseUrl: string

beforeAll(async () => {
  server = await createTestServer()
  baseUrl = server.baseUrl
})

afterAll(async () => {
  await server.close()
})

describe("GET /api/plugins", () => {
  it("returns list including example-plugin", async () => {
    const res = await api(baseUrl, "GET", "/api/plugins")
    expect(res.status).toBe(200)
    const plugins = res.body as Array<Record<string, unknown>>
    expect(Array.isArray(plugins)).toBe(true)
    const example = plugins.find((p) => p.name === "example-plugin")
    expect(example).toBeDefined()
    expect(example).toHaveProperty("description")
    expect(example).toHaveProperty("version")
  })
})

describe("POST /api/plugins/:name/run", () => {
  it("runs example-plugin and returns 201 with PluginRun", async () => {
    const res = await api(baseUrl, "POST", "/api/plugins/example-plugin/run")
    expect(res.status).toBe(201)
    const body = res.body as Record<string, unknown>
    expect(body.status).toBe("completed")
    expect(body.leads_found).toBe(3)
    expect(body.leads_added).toBe(3)
  })

  it("second run skips duplicates", async () => {
    // Ensure plugin has been run at least once so this test is self-contained
    await api(baseUrl, "POST", "/api/plugins/example-plugin/run")
    const res = await api(baseUrl, "POST", "/api/plugins/example-plugin/run")
    expect(res.status).toBe(201)
    const body = res.body as Record<string, unknown>
    expect(body.leads_added).toBe(0)
  })

  it("returns 404 for non-existent plugin", async () => {
    const res = await api(baseUrl, "POST", "/api/plugins/nonexistent-plugin/run")
    expect(res.status).toBe(404)
  })

  it("returns 404 for path traversal attempt", async () => {
    const res = await api(baseUrl, "POST", "/api/plugins/..%2Fetc/run")
    expect(res.status).toBe(404)
  })
})

describe("GET /api/plugins/runs", () => {
  it("returns runs after executing a plugin", async () => {
    const res = await api(baseUrl, "GET", "/api/plugins/runs")
    expect(res.status).toBe(200)
    const runs = res.body as Array<Record<string, unknown>>
    expect(Array.isArray(runs)).toBe(true)
    expect(runs.length).toBeGreaterThan(0)
    expect(runs[0]).toHaveProperty("plugin_name")
  })
})
