import { Effect, Layer } from "effect"
import { DatabaseServiceLive } from "./services/DatabaseService.js"
import { LeadService, LeadServiceLive } from "./services/LeadService.js"
import { OutreachService, OutreachServiceLive } from "./services/OutreachService.js"
import { PluginService, PluginServiceLive } from "./services/PluginService.js"
import { registerLeadRoutes } from "./routes/leads.js"
import { registerOutreachRoutes } from "./routes/outreach.js"
import { registerPluginRoutes } from "./routes/plugins.js"
import { createServer } from "./server.js"

const PORT = Number(process.env.PORT ?? 3001)

const DbLayer = DatabaseServiceLive
const LeadLayer = LeadServiceLive.pipe(Layer.provide(DbLayer))
const OutreachLayer = OutreachServiceLive.pipe(Layer.provide(DbLayer))
const PluginLayer = PluginServiceLive.pipe(
  Layer.provide(Layer.merge(LeadLayer, DbLayer))
)

const AppLayer = Layer.mergeAll(LeadLayer, OutreachLayer, PluginLayer)

const program = Effect.gen(function* () {
  const leadService = yield* LeadService
  const outreachService = yield* OutreachService
  const pluginService = yield* PluginService

  registerLeadRoutes(leadService)
  registerOutreachRoutes(outreachService)
  registerPluginRoutes(pluginService)

  yield* createServer(PORT)
})

Effect.runPromise(
  program.pipe(Effect.provide(AppLayer))
).catch((err) => {
  console.error("Failed to start server:", err)
  process.exit(1)
})
