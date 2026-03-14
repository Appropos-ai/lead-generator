import { Context, Effect, Layer } from "effect"
import type { OutreachEntry, CreateOutreachInput } from "@lead-generator/shared"
import { DatabaseService } from "./DatabaseService.js"

export interface OutreachService {
  readonly listByLead: (leadId: number) => Effect.Effect<OutreachEntry[]>
  readonly create: (input: CreateOutreachInput) => Effect.Effect<OutreachEntry>
  readonly remove: (id: number) => Effect.Effect<void>
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
        db.run(
          `INSERT INTO outreach_log (lead_id, date, channel, status, notes) VALUES (?, ?, ?, ?, ?)`,
          input.lead_id, input.date, input.channel, input.status, input.notes ?? null
        ),
        (result) =>
          db.get<OutreachEntry>(
            "SELECT * FROM outreach_log WHERE id = ?",
            result.lastInsertRowid
          ) as Effect.Effect<OutreachEntry>
      ),

    remove: (id) =>
      Effect.map(
        db.run("DELETE FROM outreach_log WHERE id = ?", id),
        () => undefined
      ),
  }))
)
