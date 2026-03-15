import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { leadsApi } from "../api/client.js"
import type { Lead, PaginatedLeads, UpdateLeadInput, PipelineStage } from "../api/client.js"
import toast from "react-hot-toast"

export function useLeads(opts?: { stage?: string; page?: number; limit?: number }) {
  return useQuery<PaginatedLeads>({
    queryKey: ["leads", "list", { stage: opts?.stage, page: opts?.page, limit: opts?.limit }],
    queryFn: () => leadsApi.list(opts),
  })
}

export function useLead(id: number) {
  return useQuery<Lead>({
    queryKey: ["leads", id],
    queryFn: () => leadsApi.get(id),
    enabled: !!id,
  })
}

export function useCreateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: leadsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Lead created")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLeadInput }) =>
      leadsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Lead updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: leadsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Lead deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useBulkStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, stage }: { ids: number[]; stage: PipelineStage }) =>
      leadsApi.bulkStage(ids, stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Leads updated")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useBulkDelete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: leadsApi.bulkDelete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] })
      toast.success("Leads deleted")
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
