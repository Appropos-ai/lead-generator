import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { outreachApi } from "../api/client.js"
import type { OutreachEntry, CreateOutreachInput } from "../api/client.js"
import toast from "react-hot-toast"

export function useOutreach(leadId: number) {
  return useQuery<OutreachEntry[]>({
    queryKey: ["outreach", leadId],
    queryFn: () => outreachApi.list(leadId),
    enabled: !!leadId,
  })
}

export function useCreateOutreach() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOutreachInput) => outreachApi.create(data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["outreach", vars.lead_id] })
      toast.success("Outreach logged")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteOutreach(leadId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: outreachApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["outreach", leadId] })
      toast.success("Outreach entry deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
