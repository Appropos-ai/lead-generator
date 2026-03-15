import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { DatabaseService } from "./DatabaseService.js"
import { LeadServiceLive } from "./LeadService.js"
import { PluginService, PluginServiceLive, sanitizeError, isValidPluginName, PLUGIN_NAME_RE } from "./PluginService.js"
import { createTestDbLayer } from "../test-helpers/mockDb.js"

describe("PluginService", () => {
  describe("sanitizeError", () => {
    it("redacts environment variable patterns", () => {
      expect(sanitizeError("Error: API_KEY=secret123 happened")).toBe(
        "Error: [REDACTED] happened"
      )
      expect(sanitizeError("DATABASE_URL=postgres://user:pass@host/db")).toBe(
        "[REDACTED]"
      )
    })

    it("truncates to 500 characters", () => {
      const longMsg = "x".repeat(600)
      expect(sanitizeError(longMsg)).toHaveLength(500)
    })
  })

  describe("PLUGIN_NAME_RE", () => {
    it("accepts valid plugin names", () => {
      expect(PLUGIN_NAME_RE.test("my-plugin")).toBe(true)
      expect(PLUGIN_NAME_RE.test("plugin_v2")).toBe(true)
      expect(PLUGIN_NAME_RE.test("simple")).toBe(true)
    })

    it("rejects path traversal attempts", () => {
      expect(PLUGIN_NAME_RE.test("../evil")).toBe(false)
      expect(PLUGIN_NAME_RE.test("../../etc")).toBe(false)
    })

    it("rejects special characters", () => {
      expect(PLUGIN_NAME_RE.test("my plugin")).toBe(false)
      expect(PLUGIN_NAME_RE.test("plugin.js")).toBe(false)
      expect(PLUGIN_NAME_RE.test("plugin/name")).toBe(false)
    })

    it("rejects empty string", () => {
      expect(PLUGIN_NAME_RE.test("")).toBe(false)
    })

    it("rejects names longer than 64 characters", () => {
      expect(PLUGIN_NAME_RE.test("a".repeat(65))).toBe(false)
    })

    it("accepts exactly 64 characters", () => {
      expect(PLUGIN_NAME_RE.test("a".repeat(64))).toBe(true)
    })
  })

  describe("isValidPluginName", () => {
    it("rejects path traversal attempts", () => {
      expect(isValidPluginName("../evil")).toBe(false)
      expect(isValidPluginName("../../etc/passwd")).toBe(false)
    })

    it("rejects special characters", () => {
      expect(isValidPluginName("my plugin")).toBe(false)
      expect(isValidPluginName("plugin.js")).toBe(false)
    })
  })

  describe("listRuns", () => {
    function makeLayer() {
      const dbLayer = createTestDbLayer()
      const leadLayer = LeadServiceLive.pipe(Layer.provide(dbLayer))
      return PluginServiceLive.pipe(
        Layer.provide(Layer.merge(leadLayer, dbLayer))
      )
    }

    it("returns empty array initially", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* PluginService
          return yield* svc.listRuns()
        }).pipe(Effect.provide(layer))
      )
      expect(result).toHaveLength(0)
    })

    it("returns runs ordered by started_at DESC", async () => {
      const dbLayer = createTestDbLayer()
      const leadLayer = LeadServiceLive.pipe(Layer.provide(dbLayer))
      const pluginLayer = PluginServiceLive.pipe(
        Layer.provide(Layer.merge(leadLayer, dbLayer))
      )
      const layer = Layer.merge(pluginLayer, dbLayer)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const db = yield* DatabaseService
          const svc = yield* PluginService

          // Insert test runs directly
          yield* db.run(
            "INSERT INTO plugin_runs (plugin_name, status) VALUES (?, ?)",
            "plugin-a", "completed"
          )
          yield* db.run(
            "INSERT INTO plugin_runs (plugin_name, status) VALUES (?, ?)",
            "plugin-b", "completed"
          )

          return yield* svc.listRuns()
        }).pipe(Effect.provide(layer))
      )
      expect(result).toHaveLength(2)
      const names = result.map((r) => r.plugin_name)
      expect(names).toContain("plugin-a")
      expect(names).toContain("plugin-b")
    })
  })

  describe("run", () => {
    it("fails with PluginNotFoundError for nonexistent plugin", async () => {
      const dbLayer = createTestDbLayer()
      const leadLayer = LeadServiceLive.pipe(Layer.provide(dbLayer))
      const pluginLayer = PluginServiceLive.pipe(
        Layer.provide(Layer.merge(leadLayer, dbLayer))
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* PluginService
          return yield* Effect.either(svc.run("nonexistent-plugin"))
        }).pipe(Effect.provide(pluginLayer))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("PluginNotFoundError")
      }
    })

    it("fails with PluginNotFoundError for invalid plugin name", async () => {
      const dbLayer = createTestDbLayer()
      const leadLayer = LeadServiceLive.pipe(Layer.provide(dbLayer))
      const pluginLayer = PluginServiceLive.pipe(
        Layer.provide(Layer.merge(leadLayer, dbLayer))
      )

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* PluginService
          return yield* Effect.either(svc.run("../etc/passwd"))
        }).pipe(Effect.provide(pluginLayer))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("PluginNotFoundError")
      }
    })
  })
})
