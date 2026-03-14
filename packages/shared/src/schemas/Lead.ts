import { Schema } from "effect"

export const PipelineStage = Schema.Literal(
  "new",
  "contacted",
  "responded",
  "converted",
  "lost"
)
export type PipelineStage = typeof PipelineStage.Type

const ShortString = Schema.String.pipe(Schema.maxLength(255))
const UrlString = Schema.String.pipe(Schema.maxLength(2048))
const NotesString = Schema.String.pipe(Schema.maxLength(10000))
const Email = Schema.String.pipe(
  Schema.maxLength(255),
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
)

export const Lead = Schema.Struct({
  id: Schema.Number,
  name: Schema.String,
  email: Schema.String,
  linkedin_url: Schema.NullOr(Schema.String),
  company: Schema.NullOr(Schema.String),
  title: Schema.NullOr(Schema.String),
  source: Schema.NullOr(Schema.String),
  notes: Schema.NullOr(Schema.String),
  stage: PipelineStage,
  created_at: Schema.String,
  updated_at: Schema.String,
})
export type Lead = typeof Lead.Type

export const CreateLeadInput = Schema.Struct({
  name: ShortString,
  email: Email,
  linkedin_url: Schema.optional(Schema.NullOr(UrlString)),
  company: Schema.optional(Schema.NullOr(ShortString)),
  title: Schema.optional(Schema.NullOr(ShortString)),
  source: Schema.optional(Schema.NullOr(ShortString)),
  notes: Schema.optional(Schema.NullOr(NotesString)),
  stage: Schema.optional(PipelineStage),
})
export type CreateLeadInput = typeof CreateLeadInput.Type

export const UpdateLeadInput = Schema.Struct({
  name: Schema.optional(ShortString),
  email: Schema.optional(Email),
  linkedin_url: Schema.optional(Schema.NullOr(UrlString)),
  company: Schema.optional(Schema.NullOr(ShortString)),
  title: Schema.optional(Schema.NullOr(ShortString)),
  source: Schema.optional(Schema.NullOr(ShortString)),
  notes: Schema.optional(Schema.NullOr(NotesString)),
  stage: Schema.optional(PipelineStage),
})
export type UpdateLeadInput = typeof UpdateLeadInput.Type

export const BulkStageInput = Schema.Struct({
  ids: Schema.Array(Schema.Number).pipe(Schema.maxItems(500)),
  stage: PipelineStage,
})
export type BulkStageInput = typeof BulkStageInput.Type

export const BulkDeleteInput = Schema.Struct({
  ids: Schema.Array(Schema.Number).pipe(Schema.maxItems(500)),
})
export type BulkDeleteInput = typeof BulkDeleteInput.Type
