import { describe, it, expect, vi, beforeEach } from "vitest"
import { leadsApi, outreachApi, pluginsApi } from "./client.js"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  }
}

function noContentResponse() {
  return { ok: true, status: 204, json: () => Promise.resolve(undefined) }
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe("leadsApi", () => {
  describe("list", () => {
    it("calls /api/leads with no params by default", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }))
      await leadsApi.list()
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/leads",
        expect.objectContaining({
          headers: expect.objectContaining({ "Content-Type": "application/json" }),
        })
      )
    })

    it("appends stage query param", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 1, limit: 50 }))
      await leadsApi.list({ stage: "new" })
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("stage=new")
    })

    it("appends page and limit query params", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ data: [], total: 0, page: 2, limit: 10 }))
      await leadsApi.list({ page: 2, limit: 10 })
      const url = mockFetch.mock.calls[0][0] as string
      expect(url).toContain("page=2")
      expect(url).toContain("limit=10")
    })
  })

  describe("get", () => {
    it("fetches a single lead", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ id: 1, name: "Alice" }))
      const result = await leadsApi.get(1)
      expect(mockFetch).toHaveBeenCalledWith("/api/leads/1", expect.anything())
      expect(result.name).toBe("Alice")
    })
  })

  describe("create", () => {
    it("sends POST with body", async () => {
      const lead = { name: "Alice", email: "alice@test.com" }
      mockFetch.mockResolvedValue(jsonResponse({ id: 1, ...lead }))
      await leadsApi.create(lead as any)
      const [, opts] = mockFetch.mock.calls[0]
      expect(opts.method).toBe("POST")
      expect(JSON.parse(opts.body)).toEqual(lead)
    })
  })

  describe("update", () => {
    it("sends PATCH with body", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ id: 1, name: "Updated" }))
      await leadsApi.update(1, { name: "Updated" })
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe("/api/leads/1")
      expect(opts.method).toBe("PATCH")
    })
  })

  describe("delete", () => {
    it("sends DELETE and handles 204", async () => {
      mockFetch.mockResolvedValue(noContentResponse())
      await leadsApi.delete(1)
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe("/api/leads/1")
      expect(opts.method).toBe("DELETE")
    })
  })

  describe("bulkStage", () => {
    it("sends PATCH to bulk/stage", async () => {
      mockFetch.mockResolvedValue(noContentResponse())
      await leadsApi.bulkStage([1, 2], "contacted")
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe("/api/leads/bulk/stage")
      expect(opts.method).toBe("PATCH")
      expect(JSON.parse(opts.body)).toEqual({ ids: [1, 2], stage: "contacted" })
    })
  })

  describe("bulkDelete", () => {
    it("sends POST to bulk/delete", async () => {
      mockFetch.mockResolvedValue(noContentResponse())
      await leadsApi.bulkDelete([1, 2, 3])
      const [url, opts] = mockFetch.mock.calls[0]
      expect(url).toBe("/api/leads/bulk/delete")
      expect(opts.method).toBe("POST")
      expect(JSON.parse(opts.body)).toEqual({ ids: [1, 2, 3] })
    })
  })
})

describe("error handling", () => {
  it("throws error with server error message", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ error: "Not found" }, 404))
    await expect(leadsApi.get(999)).rejects.toThrow("Not found")
  })

  it("throws generic error when response has no error field", async () => {
    mockFetch.mockResolvedValue(jsonResponse({}, 500))
    await expect(leadsApi.get(999)).rejects.toThrow("Request failed: 500")
  })

  it("throws when fetch rejects (network error)", async () => {
    mockFetch.mockRejectedValue(new TypeError("Failed to fetch"))
    await expect(leadsApi.get(1)).rejects.toThrow("Failed to fetch")
  })
})

describe("request headers", () => {
  it("sends Content-Type: application/json header", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 1, name: "Alice" }))
    await leadsApi.get(1)
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers).toEqual(
      expect.objectContaining({ "Content-Type": "application/json" })
    )
  })
})

describe("outreachApi", () => {
  it("list sends lead_id query param", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    await outreachApi.list(5)
    expect(mockFetch.mock.calls[0][0]).toBe("/api/outreach?lead_id=5")
  })

  it("create sends POST with body", async () => {
    const data = { lead_id: 1, date: "2024-01-15", channel: "email" as const, status: "sent" as const }
    mockFetch.mockResolvedValue(jsonResponse({ id: 1, ...data }))
    await outreachApi.create(data)
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe("POST")
  })

  it("delete sends DELETE", async () => {
    mockFetch.mockResolvedValue(noContentResponse())
    await outreachApi.delete(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("/api/outreach/1")
    expect(opts.method).toBe("DELETE")
  })
})

describe("pluginsApi", () => {
  it("list fetches /api/plugins", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    await pluginsApi.list()
    expect(mockFetch.mock.calls[0][0]).toBe("/api/plugins")
  })

  it("run sends POST to /api/plugins/:name/run", async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 1, status: "completed" }))
    await pluginsApi.run("my-plugin")
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("/api/plugins/my-plugin/run")
    expect(opts.method).toBe("POST")
  })

  it("runs fetches /api/plugins/runs", async () => {
    mockFetch.mockResolvedValue(jsonResponse([]))
    await pluginsApi.runs()
    expect(mockFetch.mock.calls[0][0]).toBe("/api/plugins/runs")
  })
})
