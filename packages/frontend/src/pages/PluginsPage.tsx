import { Play, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { usePlugins, usePluginRuns, useRunPlugin } from "../hooks/usePlugins.js"

export default function PluginsPage() {
  const { data: plugins = [], isLoading } = usePlugins()
  const { data: runs = [] } = usePluginRuns()
  const runPlugin = useRunPlugin()

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Plugins</h2>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : plugins.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No plugins found</div>
      ) : (
        <div className="grid gap-4 mb-8">
          {plugins.map((plugin) => (
            <div key={plugin.name} className="bg-white rounded-lg border border-gray-200 p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold">{plugin.name}</h3>
                <p className="text-sm text-gray-500">{plugin.description}</p>
                <span className="text-xs text-gray-400">v{plugin.version}</span>
              </div>
              <button
                onClick={() => runPlugin.mutate(plugin.name)}
                disabled={runPlugin.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50"
              >
                {runPlugin.isPending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                Run
              </button>
            </div>
          ))}
        </div>
      )}

      <h3 className="text-lg font-bold mb-4">Run History</h3>
      {runs.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No runs yet</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Plugin</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Found</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Added</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium">{run.plugin_name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1">
                      {run.status === "completed" && <CheckCircle size={14} className="text-green-500" />}
                      {run.status === "failed" && <XCircle size={14} className="text-red-500" />}
                      {run.status === "running" && <Loader2 size={14} className="animate-spin text-blue-500" />}
                      <span className="capitalize">{run.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">{run.leads_found}</td>
                  <td className="px-4 py-3">{run.leads_added}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(run.started_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
