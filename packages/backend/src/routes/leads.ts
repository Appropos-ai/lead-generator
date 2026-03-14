import { Effect } from "effect"
import { Schema } from "effect"
import { route } from "../server.js"
import { LeadService } from "../services/LeadService.js"
import { parseIntParam, InvalidParamError } from "../utils/validation.js"
import {
  CreateLeadInput,
  UpdateLeadInput,
  BulkStageInput,
  BulkDeleteInput,
  PipelineStage,
} from "@lead-generator/shared"

const VALID_STAGES: Set<string> = new Set(PipelineStage.literals)

export function registerLeadRoutes(leadService: LeadService) {
  route("GET", "/api/leads", (_req, params) => {
    if (params.stage && !VALID_STAGES.has(params.stage)) {
      return Effect.fail(new InvalidParamError({ message: `Invalid stage: ${params.stage}` }))
    }
    return leadService.list({
      stage: params.stage || undefined,
      page: params.page ? parseInt(params.page, 10) : undefined,
      limit: params.limit ? parseInt(params.limit, 10) : undefined,
    })
  })

  route("GET", "/api/leads/:id", (_req, params) =>
    Effect.flatMap(parseIntParam(params.id, "id"), (id) =>
      leadService.getById(id)
    )
  )

  route("POST", "/api/leads", (_req, _params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(CreateLeadInput)(body),
      (input) => leadService.create(input)
    )
  )

  route("PATCH", "/api/leads/:id", (_req, params, body) =>
    Effect.flatMap(parseIntParam(params.id, "id"), (id) =>
      Effect.flatMap(
        Schema.decodeUnknown(UpdateLeadInput)(body),
        (input) => leadService.update(id, input)
      )
    )
  )

  route("DELETE", "/api/leads/:id", (_req, params) =>
    Effect.flatMap(parseIntParam(params.id, "id"), (id) =>
      leadService.remove(id)
    )
  )

  route("PATCH", "/api/leads/bulk/stage", (_req, _params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(BulkStageInput)(body),
      (input) => leadService.bulkStage(input.ids, input.stage)
    )
  )

  route("POST", "/api/leads/bulk/delete", (_req, _params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(BulkDeleteInput)(body),
      (input) => leadService.bulkDelete(input.ids)
    ),
    { status: 200 }
  )
}
