import { Schema } from "effect"

export class LeadNotFoundError extends Schema.TaggedError<LeadNotFoundError>()(
  "LeadNotFoundError",
  { message: Schema.String },
  { status: 404 }
) {}

export class DuplicateLeadError extends Schema.TaggedError<DuplicateLeadError>()(
  "DuplicateLeadError",
  { message: Schema.String },
  { status: 409 }
) {}

export class PluginNotFoundError extends Schema.TaggedError<PluginNotFoundError>()(
  "PluginNotFoundError",
  { message: Schema.String },
  { status: 404 }
) {}

export class PluginExecutionError extends Schema.TaggedError<PluginExecutionError>()(
  "PluginExecutionError",
  { message: Schema.String },
  { status: 500 }
) {}

export class PluginDiscoveryError extends Schema.TaggedError<PluginDiscoveryError>()(
  "PluginDiscoveryError",
  { message: Schema.String },
  { status: 500 }
) {}

export class OutreachNotFoundError extends Schema.TaggedError<OutreachNotFoundError>()(
  "OutreachNotFoundError",
  { message: Schema.String },
  { status: 404 }
) {}

export class LeadReferenceError extends Schema.TaggedError<LeadReferenceError>()(
  "LeadReferenceError",
  { message: Schema.String },
  { status: 422 }
) {}
