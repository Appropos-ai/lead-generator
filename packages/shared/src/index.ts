export {
  PipelineStage,
  Lead,
  CreateLeadInput,
  UpdateLeadInput,
  BulkStageInput,
  BulkDeleteInput,
} from "./schemas/Lead.js"
export type { PipelineStage as PipelineStageType } from "./schemas/Lead.js"

export { OutreachChannel, OutreachStatus, OutreachEntry, CreateOutreachInput } from "./schemas/Outreach.js"

export { PluginMetadata, PluginRunStatus, PluginRun, ScrapedLead } from "./schemas/Plugin.js"
