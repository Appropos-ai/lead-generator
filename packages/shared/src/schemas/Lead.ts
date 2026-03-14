import { Schema } from "effect"

export const PipelineStage = Schema.Literal(
  "new",
  "contacted",
  "responded",
  "converted",
  "lost"
)
export type PipelineStage = typeof PipelineStage.Type

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
  name: Schema.String,
  email: Schema.String,
  linkedin_url: Schema.optional(Schema.NullOr(Schema.String)),
  company: Schema.optional(Schema.NullOr(Schema.String)),
  title: Schema.optional(Schema.NullOr(Schema.String)),
  source: Schema.optional(Schema.NullOr(Schema.String)),
  notes: Schema.optional(Schema.NullOr(Schema.String)),
  stage: Schema.optional(PipelineStage),
})
export type CreateLeadInput = typeof CreateLeadInput.Type

export const UpdateLeadInput = Schema.Struct({
  name: Schema.optional(Schema.String),
  email: Schema.optional(Schema.String),
  linkedin_url: Schema.optional(Schema.NullOr(Schema.String)),
  company: Schema.optional(Schema.NullOr(Schema.String)),
  title: Schema.optional(Schema.NullOr(Schema.String)),
  source: Schema.optional(Schema.NullOr(Schema.String)),
  notes: Schema.optional(Schema.NullOr(Schema.String)),
  stage: Schema.optional(PipelineStage),
})
export type UpdateLeadInput = typeof UpdateLeadInput.Type

export const BulkStageInput = Schema.Struct({
  ids: Schema.Array(Schema.Number),
  stage: PipelineStage,
})
export type BulkStageInput = typeof BulkStageInput.Type

export const BulkDeleteInput = Schema.Struct({
  ids: Schema.Array(Schema.Number),
})
export type BulkDeleteInput = typeof BulkDeleteInput.Type
