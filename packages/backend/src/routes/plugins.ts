import { route } from "../server.js"
import { PluginService } from "../services/PluginService.js"

export function registerPluginRoutes(pluginService: PluginService) {
  route("GET", "/api/plugins", () => pluginService.list())

  route("POST", "/api/plugins/:name/run", (_req, params) => pluginService.run(params.name))

  route("GET", "/api/plugins/runs", () => pluginService.listRuns())
}
