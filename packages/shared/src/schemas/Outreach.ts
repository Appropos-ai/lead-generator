import { Schema } from "effect"

export const OutreachChannel = Schema.Literal("email", "linkedin")
export type OutreachChannel = typeof OutreachChannel.Type

export const OutreachStatus = Schema.Literal("sent", "replied", "bounced")
export type OutreachStatus = typeof OutreachStatus.Type

export const OutreachEntry = Schema.Struct({
  id: Schema.Number,
  lead_id: Schema.Number,
  date: Schema.String,
  channel: OutreachChannel,
  status: OutreachStatus,
  notes: Schema.NullOr(Schema.String),
  created_at: Schema.String,
})
export type OutreachEntry = typeof OutreachEntry.Type

export const CreateOutreachInput = Schema.Struct({
  lead_id: Schema.Number,
  date: Schema.String,
  channel: OutreachChannel,
  status: OutreachStatus,
  notes: Schema.optional(Schema.NullOr(Schema.String)),
})
export type CreateOutreachInput = typeof CreateOutreachInput.Type
