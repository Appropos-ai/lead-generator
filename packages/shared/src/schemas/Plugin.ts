import { Schema } from "effect"

export const PluginMetadata = Schema.Struct({
  name: Schema.String,
  description: Schema.String,
  version: Schema.String,
})
export type PluginMetadata = typeof PluginMetadata.Type

export const PluginRunStatus = Schema.Literal("running", "completed", "failed")
export type PluginRunStatus = typeof PluginRunStatus.Type

export const PluginRun = Schema.Struct({
  id: Schema.Number,
  plugin_name: Schema.String,
  started_at: Schema.String,
  completed_at: Schema.NullOr(Schema.String),
  status: PluginRunStatus,
  leads_found: Schema.Number,
  leads_added: Schema.Number,
  error_message: Schema.NullOr(Schema.String),
})
export type PluginRun = typeof PluginRun.Type

export const ScrapedLead = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  linkedin_url: Schema.optional(Schema.NullOr(Schema.String)),
  company: Schema.optional(Schema.NullOr(Schema.String)),
  title: Schema.optional(Schema.NullOr(Schema.String)),
  notes: Schema.optional(Schema.NullOr(Schema.String)),
})
export type ScrapedLead = typeof ScrapedLead.Type
