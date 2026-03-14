import { Effect } from "effect"
import { Schema } from "effect"
import { route } from "../server.js"
import { LeadService } from "../services/LeadService.js"
import {
  CreateLeadInput,
  UpdateLeadInput,
  BulkStageInput,
  BulkDeleteInput,
} from "@lead-generator/shared"

export function registerLeadRoutes(leadService: LeadService) {
  route("GET", "/api/leads", (_req, params) =>
    leadService.list(params.stage || undefined)
  )

  route("GET", "/api/leads/:id", (_req, params) =>
    leadService.getById(Number(params.id))
  )

  route("POST", "/api/leads", (_req, _params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(CreateLeadInput)(body),
      (input) => leadService.create(input)
    )
  )

  route("PATCH", "/api/leads/:id", (_req, params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(UpdateLeadInput)(body),
      (input) => leadService.update(Number(params.id), input)
    )
  )

  route("DELETE", "/api/leads/:id", (_req, params) =>
    leadService.remove(Number(params.id))
  )

  route("POST", "/api/leads/bulk/stage", (_req, _params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(BulkStageInput)(body),
      (input) => leadService.bulkStage(input.ids, input.stage)
    )
  )

  route("POST", "/api/leads/bulk/delete", (_req, _params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(BulkDeleteInput)(body),
      (input) => leadService.bulkDelete(input.ids)
    )
  )
}
