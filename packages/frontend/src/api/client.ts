const BASE = "/api"

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export type Lead = {
  id: number
  name: string
  email: string
  linkedin_url: string | null
  company: string | null
  title: string | null
  source: string | null
  notes: string | null
  stage: "new" | "contacted" | "responded" | "converted" | "lost"
  created_at: string
  updated_at: string
}

export type OutreachEntry = {
  id: number
  lead_id: number
  date: string
  channel: "email" | "linkedin"
  status: "sent" | "replied" | "bounced"
  notes: string | null
  created_at: string
}

export type PluginMeta = {
  name: string
  description: string
  version: string
}

export type PluginRun = {
  id: number
  plugin_name: string
  started_at: string
  completed_at: string | null
  status: "running" | "completed" | "failed"
  leads_found: number
  leads_added: number
  error_message: string | null
}

export type PaginatedLeads = {
  data: Lead[]
  total: number
  page: number
  limit: number
}

// Leads
export const leadsApi = {
  list: (opts?: { stage?: string; page?: number; limit?: number }) => {
    const params = new URLSearchParams()
    if (opts?.stage) params.set("stage", opts.stage)
    if (opts?.page) params.set("page", String(opts.page))
    if (opts?.limit) params.set("limit", String(opts.limit))
    const qs = params.toString()
    return request<PaginatedLeads>(qs ? `/leads?${qs}` : "/leads")
  },
  get: (id: number) => request<Lead>(`/leads/${id}`),
  create: (data: Partial<Lead>) => request<Lead>("/leads", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Lead>) =>
    request<Lead>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/leads/${id}`, { method: "DELETE" }),
  bulkStage: (ids: number[], stage: string) =>
    request<void>("/leads/bulk/stage", { method: "PATCH", body: JSON.stringify({ ids, stage }) }),
  bulkDelete: (ids: number[]) =>
    request<void>("/leads/bulk/delete", { method: "POST", body: JSON.stringify({ ids }) }),
}

// Outreach
export const outreachApi = {
  list: (leadId: number) => request<OutreachEntry[]>(`/outreach?lead_id=${leadId}`),
  create: (data: { lead_id: number; date: string; channel: string; status: string; notes?: string }) =>
    request<OutreachEntry>("/outreach", { method: "POST", body: JSON.stringify(data) }),
  delete: (id: number) => request<void>(`/outreach/${id}`, { method: "DELETE" }),
}

// Plugins
export const pluginsApi = {
  list: () => request<PluginMeta[]>("/plugins"),
  run: (name: string) => request<PluginRun>(`/plugins/${name}/run`, { method: "POST" }),
  runs: () => request<PluginRun[]>("/plugins/runs"),
}
