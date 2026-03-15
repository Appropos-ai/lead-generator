import { useState, useEffect, useCallback } from "react"
import { useSearchParams, Link } from "react-router-dom"
import { Plus, Trash2, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { useLeads, useCreateLead, useBulkStage, useBulkDelete } from "../hooks/useLeads.js"
import type { CreateLeadInput, PipelineStage } from "../api/client.js"

const STAGES = ["all", "new", "contacted", "responded", "converted", "lost"] as const
const PAGE_SIZE = 50

const stageBadgeColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  responded: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-gray-100 text-gray-500",
}

export default function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const stageFilter = searchParams.get("stage") ?? "all"
  const page = parseInt(searchParams.get("page") ?? "1", 10)
  const { data: result, isLoading } = useLeads({
    stage: stageFilter === "all" ? undefined : stageFilter,
    page,
    limit: PAGE_SIZE,
  })
  const leads = result?.data ?? []
  const total = result?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  useEffect(() => setSelected(new Set()), [page, stageFilter])
  const [showAddModal, setShowAddModal] = useState(false)
  const handleCloseModal = useCallback(() => setShowAddModal(false), [])

  const createLead = useCreateLead()
  const bulkStage = useBulkStage()
  const bulkDelete = useBulkDelete()

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === leads.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(leads.map((l) => l.id)))
    }
  }

  const handleBulkStage = (stage: PipelineStage) => {
    bulkStage.mutate({ ids: [...selected], stage })
    setSelected(new Set())
  }

  const handleBulkDelete = () => {
    if (!confirm("Delete selected leads?")) return
    bulkDelete.mutate([...selected])
    setSelected(new Set())
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Leads</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus size={16} /> Add Lead
        </button>
      </div>

      {/* Stage filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {STAGES.map((s) => (
          <button
            key={s}
            onClick={() => setSearchParams(s === "all" ? {} : { stage: s })}  // resets page to 1
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              stageFilter === s
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-500">Move to:</span>
          {(["new", "contacted", "responded", "converted", "lost"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleBulkStage(s)}
              disabled={bulkStage.isPending || bulkDelete.isPending}
              className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 capitalize disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
          <button
            onClick={handleBulkDelete}
            disabled={bulkStage.isPending || bulkDelete.isPending}
            className="ml-auto px-2 py-1 text-xs text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No leads found</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === leads.length && leads.length > 0}
                    onChange={toggleAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Company</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Stage</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Source</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.email}</td>
                  <td className="px-4 py-3 text-gray-600">{lead.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${stageBadgeColors[lead.stage]}`}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{lead.source ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/leads/${lead.id}`}
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-xs"
                    >
                      View <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <span>{total} lead{total !== 1 ? "s" : ""} total</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set("page", String(page - 1))
                setSearchParams(next)
              }}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set("page", String(page + 1))
                setSearchParams(next)
              }}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddModal && (
        <AddLeadModal
          isPending={createLead.isPending}
          onClose={handleCloseModal}
          onSubmit={(data) => {
            createLead.mutate(data, { onSuccess: () => setShowAddModal(false) })
          }}
        />
      )}
    </div>
  )
}

type AddLeadModalProps = {
  isPending: boolean
  onClose: () => void
  onSubmit: (data: CreateLeadInput) => void
}

function AddLeadModal({ isPending, onClose, onSubmit }: AddLeadModalProps) {
  const [form, setForm] = useState({ name: "", email: "", company: "", title: "", linkedin_url: "", notes: "" })

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onClose])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: form.name,
      email: form.email,
      company: form.company || null,
      title: form.title || null,
      linkedin_url: form.linkedin_url || null,
      notes: form.notes || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">Add Lead</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            required placeholder="Name *" value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            required type="email" placeholder="Email *" value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Company" value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Title" value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="LinkedIn URL" value={form.linkedin_url}
            onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Notes" value={form.notes} rows={3}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
