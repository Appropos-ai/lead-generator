import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { pluginsApi } from "../api/client.js"
import toast from "react-hot-toast"

export function usePlugins() {
  return useQuery({
    queryKey: ["plugins"],
    queryFn: pluginsApi.list,
  })
}

export function usePluginRuns() {
  return useQuery({
    queryKey: ["plugin-runs"],
    queryFn: pluginsApi.runs,
    refetchInterval: 5000,
  })
}

export function useRunPlugin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: pluginsApi.run,
    onSuccess: (run) => {
      qc.invalidateQueries({ queryKey: ["plugin-runs"] })
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success(`Plugin completed: ${run.leads_added} leads added`)
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
