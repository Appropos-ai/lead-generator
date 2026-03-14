import { Context, Effect, Layer } from "effect"
import type { Lead, CreateLeadInput, UpdateLeadInput, PipelineStage } from "@lead-generator/shared"
import { DatabaseService } from "./DatabaseService.js"
import { LeadNotFoundError, DuplicateLeadError } from "../errors/index.js"

const UPDATABLE_LEAD_COLUMNS = new Set([
  "name", "email", "linkedin_url", "company", "title", "source", "notes", "stage",
])

export interface PaginatedLeads {
  readonly data: readonly Lead[]
  readonly total: number
  readonly page: number
  readonly limit: number
}

export interface LeadService {
  readonly list: (opts: { stage?: string; page?: number; limit?: number }) => Effect.Effect<PaginatedLeads>
  readonly getById: (id: number) => Effect.Effect<Lead, LeadNotFoundError>
  readonly create: (input: CreateLeadInput) => Effect.Effect<Lead, DuplicateLeadError>
  readonly update: (id: number, input: UpdateLeadInput) => Effect.Effect<Lead, LeadNotFoundError | DuplicateLeadError>
  readonly remove: (id: number) => Effect.Effect<void, LeadNotFoundError>
  readonly bulkStage: (ids: readonly number[], stage: PipelineStage) => Effect.Effect<void>
  readonly bulkDelete: (ids: readonly number[]) => Effect.Effect<void>
}

export const LeadService = Context.GenericTag<LeadService>("LeadService")

export const LeadServiceLive = Layer.effect(
  LeadService,
  Effect.map(DatabaseService, (db): LeadService => ({
    list: ({ stage, page = 1, limit = 50 }) => {
      const offset = (page - 1) * limit
      const where = stage ? "WHERE stage = ?" : ""
      const params = stage ? [stage] : []

      return Effect.flatMap(
        db.get<{ count: number }>(`SELECT COUNT(*) as count FROM leads ${where}`, ...params),
        (row) => {
          const total = row?.count ?? 0
          return Effect.map(
            db.all<Lead>(
              `SELECT * FROM leads ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
              ...params, limit, offset
            ),
            (data): PaginatedLeads => ({ data, total, page, limit })
          )
        }
      )
    },

    getById: (id) =>
      Effect.flatMap(
        db.get<Lead>("SELECT * FROM leads WHERE id = ?", id),
        (lead) =>
          lead
            ? Effect.succeed(lead)
            : Effect.fail(new LeadNotFoundError({ message: `Lead ${id} not found` }))
      ),

    create: (input) =>
      Effect.flatMap(
        db.get<Lead>("SELECT * FROM leads WHERE email = ?", input.email),
        (existing) => {
          if (existing) {
            return Effect.fail(new DuplicateLeadError({ message: `Lead with email ${input.email} already exists` }))
          }
          const stage = input.stage ?? "new"
          return Effect.flatMap(
            db.run(
              `INSERT INTO leads (name, email, linkedin_url, company, title, source, notes, stage)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              input.name, input.email,
              input.linkedin_url ?? null, input.company ?? null,
              input.title ?? null, input.source ?? null,
              input.notes ?? null, stage
            ),
            (result) =>
              Effect.flatMap(
                db.get<Lead>("SELECT * FROM leads WHERE id = ?", result.lastInsertRowid),
                (lead) => lead ? Effect.succeed(lead) : Effect.die(new Error("Lead not found after insert"))
              )
          )
        }
      ),

    update: (id, input) =>
      Effect.gen(function* () {
        const existing = yield* Effect.flatMap(
          db.get<Lead>("SELECT * FROM leads WHERE id = ?", id),
          (lead) =>
            lead
              ? Effect.succeed(lead)
              : Effect.fail(new LeadNotFoundError({ message: `Lead ${id} not found` }))
        )

        if (input.email && input.email !== existing.email) {
          const dup = yield* db.get<Lead>("SELECT * FROM leads WHERE email = ? AND id != ?", input.email, id)
          if (dup) {
            return yield* Effect.fail(new DuplicateLeadError({ message: `Email ${input.email} already in use` }))
          }
        }

        const fields: string[] = []
        const values: unknown[] = []
        for (const [key, value] of Object.entries(input)) {
          if (value !== undefined && UPDATABLE_LEAD_COLUMNS.has(key)) {
            fields.push(`${key} = ?`)
            values.push(value)
          }
        }

        if (fields.length > 0) {
          values.push(id)
          yield* db.run(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`, ...values)
        }

        const updated = yield* db.get<Lead>("SELECT * FROM leads WHERE id = ?", id)
        if (!updated) return yield* Effect.fail(new LeadNotFoundError({ message: `Lead ${id} not found after update` }))
        return updated
      }),

    remove: (id) =>
      Effect.flatMap(
        db.get<Lead>("SELECT * FROM leads WHERE id = ?", id),
        (lead) => {
          if (!lead) return Effect.fail(new LeadNotFoundError({ message: `Lead ${id} not found` }))
          return Effect.map(db.run("DELETE FROM leads WHERE id = ?", id), () => undefined)
        }
      ),

    bulkStage: (ids, stage) => {
      if (ids.length === 0) return Effect.void
      const placeholders = ids.map(() => "?").join(",")
      return Effect.map(
        db.run(
          `UPDATE leads SET stage = ? WHERE id IN (${placeholders})`,
          stage, ...ids
        ),
        () => undefined
      )
    },

    bulkDelete: (ids) => {
      if (ids.length === 0) return Effect.void
      const placeholders = ids.map(() => "?").join(",")
      return Effect.map(
        db.run(`DELETE FROM leads WHERE id IN (${placeholders})`, ...ids),
        () => undefined
      )
    },
  }))
)
