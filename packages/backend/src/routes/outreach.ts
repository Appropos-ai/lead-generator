import { Effect, Schema } from "effect"
import { route } from "../server.js"
import { OutreachService } from "../services/OutreachService.js"
import { CreateOutreachInput } from "@lead-generator/shared"

export function registerOutreachRoutes(outreachService: OutreachService) {
  route("GET", "/api/outreach/:leadId", (_req, params) =>
    outreachService.listByLead(Number(params.leadId))
  )

  route("POST", "/api/outreach", (_req, _params, body) =>
    Effect.flatMap(
      Schema.decodeUnknown(CreateOutreachInput)(body),
      (input) => outreachService.create(input)
    )
  )

  route("DELETE", "/api/outreach/:id", (_req, params) =>
    outreachService.remove(Number(params.id))
  )
}
