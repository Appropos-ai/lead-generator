import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { LeadService, LeadServiceLive } from "./LeadService.js"
import { OutreachService, OutreachServiceLive } from "./OutreachService.js"
import { createTestDbLayer } from "../test-helpers/mockDb.js"
import { validLead, validOutreach } from "../test-helpers/fixtures.js"

function makeLayer() {
  const dbLayer = createTestDbLayer()
  const leadLayer = LeadServiceLive.pipe(Layer.provide(dbLayer))
  const outreachLayer = OutreachServiceLive.pipe(Layer.provide(dbLayer))
  return Layer.merge(leadLayer, outreachLayer)
}

describe("OutreachService", () => {
  describe("listByLead", () => {
    it("returns empty array initially", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const leads = yield* LeadService
          const outreach = yield* OutreachService
          const lead = yield* leads.create(validLead)
          return yield* outreach.listByLead(lead.id)
        }).pipe(Effect.provide(layer))
      )
      expect(result).toHaveLength(0)
    })

    it("returns entries ordered by date DESC", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const leads = yield* LeadService
          const outreach = yield* OutreachService
          const lead = yield* leads.create(validLead)
          yield* outreach.create({ ...validOutreach(lead.id), date: "2024-01-01" })
          yield* outreach.create({ ...validOutreach(lead.id), date: "2024-01-15" })
          yield* outreach.create({ ...validOutreach(lead.id), date: "2024-01-10" })
          return yield* outreach.listByLead(lead.id)
        }).pipe(Effect.provide(layer))
      )
      expect(result).toHaveLength(3)
      expect(result[0].date).toBe("2024-01-15")
      expect(result[1].date).toBe("2024-01-10")
      expect(result[2].date).toBe("2024-01-01")
    })

    it("returns empty array for nonexistent lead_id", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const outreach = yield* OutreachService
          return yield* outreach.listByLead(99999)
        }).pipe(Effect.provide(layer))
      )
      expect(result).toHaveLength(0)
    })

    it("scopes entries to the given lead", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const leads = yield* LeadService
          const outreach = yield* OutreachService
          const lead1 = yield* leads.create(validLead)
          const lead2 = yield* leads.create({ name: "Other", email: "other@test.com" })
          yield* outreach.create(validOutreach(lead1.id))
          yield* outreach.create(validOutreach(lead2.id))
          return yield* outreach.listByLead(lead1.id)
        }).pipe(Effect.provide(layer))
      )
      expect(result).toHaveLength(1)
    })
  })

  describe("create", () => {
    it("creates outreach entry successfully", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const leads = yield* LeadService
          const outreach = yield* OutreachService
          const lead = yield* leads.create(validLead)
          return yield* outreach.create(validOutreach(lead.id))
        }).pipe(Effect.provide(layer))
      )
      expect(result.id).toBeGreaterThan(0)
      expect(result.channel).toBe("email")
      expect(result.status).toBe("sent")
    })

    it("fails with LeadReferenceError for invalid lead_id", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const outreach = yield* OutreachService
          return yield* Effect.either(outreach.create(validOutreach(999)))
        }).pipe(Effect.provide(layer))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("LeadReferenceError")
      }
    })
  })

  describe("remove", () => {
    it("removes outreach entry successfully", async () => {
      const layer = makeLayer()
      await Effect.runPromise(
        Effect.gen(function* () {
          const leads = yield* LeadService
          const outreach = yield* OutreachService
          const lead = yield* leads.create(validLead)
          const entry = yield* outreach.create(validOutreach(lead.id))
          yield* outreach.remove(entry.id)
          const entries = yield* outreach.listByLead(lead.id)
          expect(entries).toHaveLength(0)
        }).pipe(Effect.provide(layer))
      )
    })

    it("fails with OutreachNotFoundError for missing entry", async () => {
      const layer = makeLayer()
      const result = await Effect.runPromise(
        Effect.gen(function* () {
          const outreach = yield* OutreachService
          return yield* Effect.either(outreach.remove(999))
        }).pipe(Effect.provide(layer))
      )
      expect(result._tag).toBe("Left")
      if (result._tag === "Left") {
        expect(result.left._tag).toBe("OutreachNotFoundError")
      }
    })
  })
})
