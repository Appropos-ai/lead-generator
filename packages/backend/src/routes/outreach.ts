import { Effect, Schema } from "effect"
import { route } from "../server.js"
import { OutreachService } from "../services/OutreachService.js"
import { parseIntParam } from "../utils/validation.js"
import { CreateOutreachInput } from "@lead-generator/shared"

export function registerOutreachRoutes(outreachService: OutreachService) {
  route("GET", "/api/outreach", (_req, params) =>
    Effect.flatMap(parseIntParam(params.lead_id, "lead_id"), (leadId) =>
      outreachService.listByLead(leadId)
    )
  )

  route("POST", "/api/outreach", (_req, _params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(CreateOutreachInput)(body),
      (input) => outreachService.create(input)
    )
  )

  route("DELETE", "/api/outreach/:id", (_req, params) =>
    Effect.flatMap(parseIntParam(params.id, "id"), (id) =>
      outreachService.remove(id)
    )
  )
}
