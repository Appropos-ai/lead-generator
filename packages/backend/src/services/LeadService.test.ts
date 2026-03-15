import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { LeadService, LeadServiceLive } from "./LeadService.js"
import { DatabaseService } from "./DatabaseService.js"
import { createTestDbLayer } from "../test-helpers/mockDb.js"
import { validLead, validLead2, validLead3 } from "../test-helpers/fixtures.js"

function makeLayer() {
  const dbLayer = createTestDbLayer()
  return LeadServiceLive.pipe(Layer.provide(dbLayer))
}

function run<A, E>(effect: Effect.Effect<A, E, LeadService>) {
  return Effect.runPromise(effect.pipe(Effect.provide(makeLayer())))
}

function runEither<A, E>(effect: Effect.Effect<A, E, LeadService>) {
  return Effect.runPromise(Effect.either(effect.pipe(Effect.provide(makeLayer()))))
}

describe("LeadService", () => {
  describe("list", () => {
    it("returns empty result initially", async () => {
      const result = await run(
        Effect.flatMap(LeadService, (svc) => svc.list({}))
      )
      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it("returns created leads without filter", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          yield* svc.create(validLead)
          yield* svc.create(validLead2)
          return yield* svc.list({})
        }).pipe(Effect.provide(layer))
      )
      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it("filters by stage", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          yield* svc.create(validLead) // stage: new
          yield* svc.create(validLead2) // stage: contacted
          return yield* svc.list({ stage: "new" })
        }).pipe(Effect.provide(layer))
      )
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe("Alice Test")
    })

    it("uses default page=1 and limit=50", async () => {
      const result = await run(
        Effect.flatMap(LeadService, (svc) => svc.list({}))
      )
      expect(result.page).toBe(1)
      expect(result.limit).toBe(50)
    })

    it("respects custom page and limit", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          yield* svc.create(validLead)
          yield* svc.create(validLead2)
          yield* svc.create(validLead3)
          return yield* svc.list({ page: 2, limit: 1 })
        }).pipe(Effect.provide(layer))
      )
      expect(result.page).toBe(2)
      expect(result.limit).toBe(1)
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(3)
    })

    it("returns leads ordered by created_at DESC", async () => {
      const dbLayer = createTestDbLayer()
      const leadLayer = LeadServiceLive.pipe(Layer.provide(dbLayer))
      const layer = Layer.merge(leadLayer, dbLayer)

      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const db = yield* DatabaseService
          const svc = yield* LeadService

          // Insert leads with explicit timestamps to control order
          yield* db.run(
            `INSERT INTO leads (name, email, stage, created_at) VALUES (?, ?, ?, ?)`,
            "Oldest", "oldest@test.com", "new", "2024-01-01T00:00:00Z"
          )
          yield* db.run(
            `INSERT INTO leads (name, email, stage, created_at) VALUES (?, ?, ?, ?)`,
            "Newest", "newest@test.com", "new", "2024-01-03T00:00:00Z"
          )
          yield* db.run(
            `INSERT INTO leads (name, email, stage, created_at) VALUES (?, ?, ?, ?)`,
            "Middle", "middle@test.com", "new", "2024-01-02T00:00:00Z"
          )

          return yield* svc.list({})
        }).pipe(Effect.provide(layer))
      )
      expect(result.data).toHaveLength(3)
      expect(result.data[0].name).toBe("Newest")
      expect(result.data[1].name).toBe("Middle")
      expect(result.data[2].name).toBe("Oldest")
    })

    it("returns correct total with filter", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          yield* svc.create(validLead)
          yield* svc.create(validLead2)
          return yield* svc.list({ stage: "contacted" })
        }).pipe(Effect.provide(layer))
      )
      expect(result.total).toBe(1)
    })

    it("returns all leads with correct total", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          yield* svc.create(validLead)
          yield* svc.create(validLead2)
          return yield* svc.list({})
        }).pipe(Effect.provide(layer))
      )
      expect(result.data).toHaveLength(2)
      const names = result.data.map((d) => d.name)
      expect(names).toContain("Alice Test")
      expect(names).toContain("Bob Test")
    })
  })

  describe("getById", () => {
    it("returns lead when found", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          const created = yield* svc.create(validLead)
          return yield* svc.getById(created.id)
        }).pipe(Effect.provide(layer))
      )
      expect(result.name).toBe("Alice Test")
    })

    it("fails with LeadNotFoundError when not found", async () => {
      const result = await runEither(
        Effect.flatMap(LeadService, (svc) => svc.getById(999))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("LeadNotFoundError")
      }
    })
  })

  describe("create", () => {
    it("creates lead with defaults", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          return yield* svc.create(validLead3) // minimal: name + email
        }).pipe(Effect.provide(layer))
      )
      expect(result.name).toBe("Charlie Test")
      expect(result.email).toBe("charlie@test.com")
      expect(result.stage).toBe("new")
      expect(result.id).toBeGreaterThan(0)
    })

    it("creates lead with all fields", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          return yield* svc.create(validLead)
        }).pipe(Effect.provide(layer))
      )
      expect(result.name).toBe("Alice Test")
      expect(result.company).toBe("Test Corp")
      expect(result.title).toBe("Engineer")
      expect(result.source).toBe("manual")
    })

    it("fails with DuplicateLeadError for duplicate email", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          yield* svc.create(validLead)
          return yield* Effect.either(svc.create(validLead))
        }).pipe(Effect.provide(layer))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("DuplicateLeadError")
      }
    })
  })

  describe("update", () => {
    it("updates lead successfully", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          const created = yield* svc.create(validLead)
          return yield* svc.update(created.id, { name: "Updated Name" })
        }).pipe(Effect.provide(layer))
      )
      expect(result.name).toBe("Updated Name")
    })

    it("fails with LeadNotFoundError for missing lead", async () => {
      const result = await runEither(
        Effect.flatMap(LeadService, (svc) => svc.update(999, { name: "Test" }))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("LeadNotFoundError")
      }
    })

    it("fails with DuplicateLeadError when email conflicts", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          yield* svc.create(validLead)
          const lead2 = yield* svc.create(validLead2)
          return yield* Effect.either(svc.update(lead2.id, { email: validLead.email }))
        }).pipe(Effect.provide(layer))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("DuplicateLeadError")
      }
    })

    it("allows updating with unchanged email", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          const created = yield* svc.create(validLead)
          return yield* svc.update(created.id, { email: validLead.email })
        }).pipe(Effect.provide(layer))
      )
      expect(result.email).toBe(validLead.email)
    })

    it("only updates provided fields", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          const created = yield* svc.create(validLead)
          return yield* svc.update(created.id, { name: "New Name" })
        }).pipe(Effect.provide(layer))
      )
      expect(result.name).toBe("New Name")
      expect(result.email).toBe(validLead.email)
      expect(result.company).toBe(validLead.company)
    })

    it("ignores unknown keys", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          const created = yield* svc.create(validLead)
          return yield* svc.update(created.id, { name: "New Name", bogus: "ignored" } as any)
        }).pipe(Effect.provide(layer))
      )
      expect(result.name).toBe("New Name")
    })
  })

  describe("remove", () => {
    it("removes lead successfully", async () => {
      const layer = makeLayer()
      await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          const created = yield* svc.create(validLead)
          yield* svc.remove(created.id)
          const result = yield* Effect.either(svc.getById(created.id))
          expect(result._tag).toBe("Left")
        }).pipe(Effect.provide(layer))
      )
    })

    it("fails with LeadNotFoundError for missing lead", async () => {
      const result = await runEither(
        Effect.flatMap(LeadService, (svc) => svc.remove(999))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("LeadNotFoundError")
      }
    })
  })

  describe("bulkStage", () => {
    it("updates multiple leads' stage", async () => {
      const layer = makeLayer()
      await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          const lead1 = yield* svc.create(validLead)
          const lead2 = yield* svc.create(validLead2)
          yield* svc.bulkStage([lead1.id, lead2.id], "converted")
          const updated1 = yield* svc.getById(lead1.id)
          const updated2 = yield* svc.getById(lead2.id)
          expect(updated1.stage).toBe("converted")
          expect(updated2.stage).toBe("converted")
        }).pipe(Effect.provide(layer))
      )
    })

    it("handles empty array as no-op", async () => {
      await run(
        Effect.flatMap(LeadService, (svc) => svc.bulkStage([], "new"))
      )
      // No error thrown = pass
    })
  })

  describe("bulkDelete", () => {
    it("deletes multiple leads", async () => {
      const layer = makeLayer()
      await Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* LeadService
          const lead1 = yield* svc.create(validLead)
          const lead2 = yield* svc.create(validLead2)
          yield* svc.bulkDelete([lead1.id, lead2.id])
          const result = yield* svc.list({})
          expect(result.total).toBe(0)
        }).pipe(Effect.provide(layer))
      )
    })

    it("handles empty array as no-op", async () => {
      await run(
        Effect.flatMap(LeadService, (svc) => svc.bulkDelete([]))
      )
    })
  })
})
