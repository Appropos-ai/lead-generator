import { Context, Effect, Layer } from "effect"
import type { OutreachEntry, CreateOutreachInput } from "@lead-generator/shared"
import { DatabaseService } from "./DatabaseService.js"
import { OutreachNotFoundError, LeadReferenceError } from "../errors/index.js"

export interface OutreachService {
  readonly listByLead: (leadId: number) => Effect.Effect<OutreachEntry[]>
  readonly create: (input: CreateOutreachInput) => Effect.Effect<OutreachEntry, LeadReferenceError>
  readonly remove: (id: number) => Effect.Effect<void, OutreachNotFoundError>
}

export const OutreachService = Context.GenericTag<OutreachService>("OutreachService")

export const OutreachServiceLive = Layer.effect(
  OutreachService,
  Effect.map(DatabaseService, (db): OutreachService => ({
    listByLead: (leadId) =>
      db.all<OutreachEntry>(
        "SELECT * FROM outreach_log WHERE lead_id = ? ORDER BY date DESC",
        leadId
      ),

    create: (input) =>
      Effect.flatMap(
        db.get<{ id: number }>("SELECT id FROM leads WHERE id = ?", input.lead_id),
        (lead) => {
          if (!lead) return Effect.fail(new LeadReferenceError({ message: `Lead ${input.lead_id} not found` }))
          return Effect.flatMap(
            db.run(
              `INSERT INTO outreach_log (lead_id, date, channel, status, notes) VALUES (?, ?, ?, ?, ?)`,
              input.lead_id, input.date, input.channel, input.status, input.notes ?? null
            ),
            (result) =>
              Effect.flatMap(
                db.get<OutreachEntry>(
                  "SELECT * FROM outreach_log WHERE id = ?",
                  result.lastInsertRowid
                ),
                (entry) => entry ? Effect.succeed(entry) : Effect.die(new Error("Outreach entry not found after insert"))
              )
          )
        }
      ),

    remove: (id) =>
      Effect.flatMap(
        db.run("DELETE FROM outreach_log WHERE id = ?", id),
        (result) =>
          result.changes === 0
            ? Effect.fail(new OutreachNotFoundError({ message: `Outreach entry ${id} not found` }))
            : Effect.void
      ),
  }))
)
